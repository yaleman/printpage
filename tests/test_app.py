import json
import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import printpage
from printpage import models, printer, state, stock


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(state, "CONFIG_PATH", tmp_path / "printpage.json")
    return TestClient(printpage.app)


def completed(
    cmd: list[str],
    stdout: str = "",
    stderr: str = "",
    returncode: int = 0,
) -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(cmd, returncode, stdout=stdout, stderr=stderr)


def default_profile_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": "Shipping label",
        "rows": [
            {
                "text": "hello",
                "level": "h2",
                "bold": True,
                "italic": False,
                "alignment": "center",
            },
            {
                "text": "body",
                "level": "normal",
                "bold": False,
                "italic": True,
                "alignment": "justify",
            },
        ],
        "border": {
            "enabled": False,
            "thickness_mm": 0.5,
            "inset_mm": 1.0,
            "radius_mm": 1.5,
        },
        "width_mm": 62,
        "height_mm": 29,
        "cut_every": 1,
        "quality": "BrQuality",
        "quantity": 2,
    }
    payload.update(overrides)
    return payload


def fake_lpstat_output() -> str:
    return "printer QL700 is idle.\nsystem default destination: QL700\n"


def assert_neutral_print_options(cmd: list[str]) -> None:
    assert "fit-to-page=false" in cmd
    assert "scaling=100" in cmd
    assert "number-up=1" in cmd


def test_parse_lpstat_destinations() -> None:
    output = """printer QL700 is idle. enabled since Sun Mar 29 20:40:03 2026
printer BOGPRINTER is idle. enabled since Thu Sep 18 15:38:31 2025
system default destination: QL700
"""

    queues, default_queue = printer.parse_lpstat_destinations(output)

    assert queues == ["QL700", "BOGPRINTER"]
    assert default_queue == "QL700"


def test_parse_lpoptions_choices() -> None:
    output = """BrCutLabel/Cut Label: 1 2 *3
BrPriority/Quality: *BrSpeed BrQuality
"""

    parsed = printer.parse_lpoptions_choices(output)

    assert parsed["BrCutLabel"]["default"] == "3"
    assert parsed["BrCutLabel"]["choices"] == ["1", "2", "3"]
    assert parsed["BrPriority"]["choices"] == ["BrSpeed", "BrQuality"]


def test_parse_lpoptions_defaults() -> None:
    output = "copies=1 media=62X1 orientation-requested=4 fit-to-page=false landscape"

    parsed = printer.parse_lpoptions_defaults(output)

    assert parsed == {
        "copies": "1",
        "media": "62X1",
        "orientation-requested": "4",
        "fit-to-page": "false",
        "landscape": "true",
    }


def test_parse_lpstat_jobs() -> None:
    output = """QL700-17 alice 1024 Tue 30 Mar 2026 09:00:00 AM AEST
QL700-18 bob 2048 Tue 30 Mar 2026 09:01:00 AM AEST
"""

    assert printer.parse_lpstat_jobs(output) == ["QL700-17", "QL700-18"]


def test_parse_lpstat_printer_status() -> None:
    idle_output = "printer QL700 is idle.  enabled since Sun Mar 29 20:40:03 2026\n"
    disabled_output = (
        "printer QL700 disabled since Sun Mar 29 20:40:03 2026 - reason unknown\n"
    )

    assert printer.parse_lpstat_printer_status(idle_output) == (
        True,
        True,
        "idle",
        "printer QL700 is idle.  enabled since Sun Mar 29 20:40:03 2026",
    )
    assert printer.parse_lpstat_printer_status(disabled_output) == (
        True,
        False,
        "disabled",
        "printer QL700 disabled since Sun Mar 29 20:40:03 2026 - reason unknown",
    )


def test_resolve_stock_compatibility_for_continuous_and_fixed_stock() -> None:
    continuous_too_wide = stock.resolve_stock_compatibility(
        models.LabelProfileInput.model_validate(
            default_profile_payload(width_mm=80, height_mm=75)
        ),
        stock_width_mm=62,
        stock_is_continuous=True,
        stock_length_mm=None,
    )
    continuous_auto_switched = stock.resolve_stock_compatibility(
        models.LabelProfileInput.model_validate(
            default_profile_payload(width_mm=75, height_mm=62)
        ),
        stock_width_mm=62,
        stock_is_continuous=True,
        stock_length_mm=None,
    )
    continuous_narrow = stock.resolve_stock_compatibility(
        models.LabelProfileInput.model_validate(
            default_profile_payload(width_mm=40, height_mm=20)
        ),
        stock_width_mm=62,
        stock_is_continuous=True,
        stock_length_mm=None,
    )
    continuous_exact_width_match_prefers_switched_orientation = (
        stock.resolve_stock_compatibility(
            models.LabelProfileInput.model_validate(
                default_profile_payload(width_mm=22, height_mm=61.98)
            ),
            stock_width_mm=61.98,
            stock_is_continuous=True,
            stock_length_mm=None,
        )
    )
    fixed_exact = stock.resolve_stock_compatibility(
        models.LabelProfileInput.model_validate(default_profile_payload()),
        stock_width_mm=62,
        stock_is_continuous=False,
        stock_length_mm=29,
    )
    fixed_mismatch = stock.resolve_stock_compatibility(
        models.LabelProfileInput.model_validate(
            default_profile_payload(width_mm=70, height_mm=40)
        ),
        stock_width_mm=62,
        stock_is_continuous=False,
        stock_length_mm=29,
    )

    assert continuous_too_wide.fits_loaded_stock is False
    assert continuous_too_wide.fit_mode == "cannot_fit"
    assert "only 62mm wide" in (continuous_too_wide.message or "")

    assert continuous_auto_switched.fits_loaded_stock is True
    assert continuous_auto_switched.fit_mode == "fits_auto_switched"
    assert continuous_auto_switched.applied_orientation == "landscape"
    assert continuous_auto_switched.auto_switched_orientation is True
    assert "switch to landscape automatically" in (continuous_auto_switched.message or "")

    assert continuous_narrow.fits_loaded_stock is True
    assert continuous_narrow.fit_mode == "fits_selected"
    assert continuous_narrow.message is None

    assert continuous_exact_width_match_prefers_switched_orientation.fits_loaded_stock is True
    assert continuous_exact_width_match_prefers_switched_orientation.fit_mode == "fits_auto_switched"
    assert (
        continuous_exact_width_match_prefers_switched_orientation.applied_orientation
        == "landscape"
    )
    assert "matches the loaded continuous 61.98mm roll" in (
        continuous_exact_width_match_prefers_switched_orientation.message or ""
    )

    assert fixed_exact.fits_loaded_stock is True
    assert fixed_exact.fit_mode == "fits_selected"
    assert fixed_exact.message is None

    assert fixed_mismatch.fits_loaded_stock is False
    assert fixed_mismatch.fit_mode == "cannot_fit"
    assert "may misprint" in (fixed_mismatch.message or "")


def test_get_api_state_seeds_default_profile_without_printer_lookup(
    client: TestClient,
) -> None:
    response = client.get("/api/state")

    assert response.status_code == 200
    payload = response.json()
    assert payload["queue_name"] == "Brother_QL700"
    assert payload["stock_width_mm"] == 62.0
    assert payload["stock_is_continuous"] is False
    assert payload["stock_length_mm"] == 29.0
    assert payload["selected_profile_id"]
    assert len(payload["profiles"]) == 1
    assert payload["profiles"][0]["name"] == "Default label"
    assert payload["profiles"][0]["rows"][0]["text"] == "New label"
    assert state.CONFIG_PATH.exists()


def test_index_loads_compiled_assets(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    body = response.text
    assert '/static/app.css' in body
    assert '/static/app.js' in body


def test_static_assets_are_served(client: TestClient) -> None:
    css_response = client.get("/static/app.css")
    js_response = client.get("/static/app.js")

    assert css_response.status_code == 200
    assert js_response.status_code == 200
    assert "tailwindcss" in css_response.text
    assert "axios" in js_response.text
    assert "/labels.pdf" in js_response.text
    assert "/api/queue-status" in js_response.text


def test_frontend_editor_source_tracks_dirty_state_and_delete_confirmation() -> None:
    source = Path("frontend/src/app.ts").read_text(encoding="utf-8")
    stock_fit_source = Path("frontend/src/stockFit.ts").read_text(encoding="utf-8")
    template = Path("printpage/templates/index.html").read_text(encoding="utf-8")

    assert 'alignment: "center"' in source
    assert 'orientation: "portrait"' in source
    assert 'from "./stockFit"' in source
    assert "evaluateStockFit" in source
    assert "effectiveDimensions" in stock_fit_source
    assert "alternateOrientation" in stock_fit_source
    assert "active-stock-summary" in template
    assert "stock-warning" in template
    assert 'data-state=""' in template
    assert "secondary-dimension-label" in template
    assert "updateDimensionLabels" in source
    assert "setDimensionToPrinterWidth" in source
    assert 'id="orientation"' in template
    assert 'id="set-width-to-printer-button"' in template
    assert 'id="set-height-to-printer-button"' in template
    assert "is-continuous-toggle" not in template
    assert 'requireElement<HTMLInputElement>("is_continuous")' not in source
    assert "baselinePayloadSnapshot" in source
    assert "nav-button--save-ready" in source
    assert "window.confirm(" in source
    assert "getQueueStatusApiQueueStatusGet" in source
    assert "startQueueStatusPolling" in source
    assert 'id="queue-status-indicator"' in template
    assert 'id="queue-status-text"' in template
    assert 'data-row-style-controls' in template
    style_controls_index = template.index('data-row-style-controls')
    text_area_index = template.index('id="row-text"')
    assert style_controls_index < template.index('id="row-bold-button"') < text_area_index
    assert style_controls_index < template.index('data-row-alignment="justify"') < text_area_index


def test_config_source_tracks_stock_controls() -> None:
    source = Path("frontend/src/config.ts").read_text(encoding="utf-8")
    template = Path("printpage/templates/config.html").read_text(encoding="utf-8")

    assert "stockWidthInput" in source
    assert "updateLengthVisibility" in source
    assert "queryOptionsButton" in source
    assert "getConfigOptionsApiConfigOptionsGet" in source
    assert "getConfigDefaultsApiConfigDefaultsGet" in source
    assert "renderTroubleshooting" in source
    assert "loadQueueDiagnostics" in source
    assert "getQueueStatusApiQueueStatusGet" in source
    assert "startQueueStatusPolling" in source
    assert "stock-summary" in template
    assert 'id="stock_length_mm"' in template
    assert 'id="query-options-button"' in template
    assert 'id="queue-options"' in template
    assert 'id="queue-defaults"' in template
    assert 'id="queue-troubleshooting"' in template
    assert 'id="queue-status-indicator"' in template
    assert template.index('id="queue-troubleshooting"') < template.index('id="config-form"')


def test_docker_sources_seed_fake_cups_queue() -> None:
    dockerfile = Path("Dockerfile").read_text(encoding="utf-8")
    entrypoint = Path("entrypoint.sh").read_text(encoding="utf-8")
    ppd = Path("printpage/testing/fake-brother-ql700.ppd").read_text(encoding="utf-8")

    assert "cups-daemon" in dockerfile
    assert "cups-bsd" in dockerfile
    assert "sudo" in dockerfile
    assert "FileDevice Yes" in dockerfile
    assert "FAKE_QUEUE_NAME" in entrypoint
    assert "cups-files.conf" in entrypoint
    assert "FileDevice Yes" in entrypoint
    assert 'file:$FAKE_QUEUE_OUTPUT' in entrypoint
    assert "fake-brother-ql700.ppd" in entrypoint
    assert "*OpenUI *BrCutLabel/Cut Label: PickOne" in ppd
    assert '*cupsFilter2: "application/pdf application/pdf 0 -"' in ppd


def test_openapi_schema_hides_html_pages_and_types_api_responses(
    client: TestClient,
) -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    payload = response.json()

    assert "/" not in payload["paths"]
    assert "/config" not in payload["paths"]
    assert payload["paths"]["/api/state"]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]["$ref"] == "#/components/schemas/AppState"
    assert payload["paths"]["/api/config"]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]["$ref"] == "#/components/schemas/QueueState"
    assert payload["paths"]["/api/config/defaults"]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]["additionalProperties"]["type"] == "string"
    assert payload["paths"]["/api/queue-status"]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]["$ref"] == "#/components/schemas/QueueStatus"
    assert payload["paths"]["/print"]["post"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]["$ref"] == "#/components/schemas/PrintJobResult"
    assert payload["paths"]["/labels.pdf"]["post"]["responses"]["200"]["content"] == {
        "application/pdf": {}
    }


def test_index_disables_save_button_until_changes_exist(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert 'id="save-button" disabled data-state="clean"' in response.text


def test_create_update_select_and_delete_profile(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpstat", "-p", "-d"]:
            return completed(cmd, stdout=fake_lpstat_output())
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)

    initial_state = client.get("/api/state").json()
    default_id = initial_state["selected_profile_id"]

    create_response = client.post("/api/profiles", json=default_profile_payload())
    assert create_response.status_code == 200
    created_state = create_response.json()
    assert len(created_state["profiles"]) == 2
    created_id = created_state["selected_profile_id"]
    assert created_id != default_id

    update_response = client.put(
        f"/api/profiles/{created_id}",
        json=default_profile_payload(name="Updated", quantity=5),
    )
    assert update_response.status_code == 200
    updated_state = update_response.json()
    updated_profile = next(
        profile for profile in updated_state["profiles"] if profile["id"] == created_id
    )
    assert updated_profile["name"] == "Updated"
    assert updated_profile["quantity"] == 5

    select_response = client.post(f"/api/profiles/{default_id}/select")
    assert select_response.status_code == 200
    assert select_response.json()["selected_profile_id"] == default_id

    delete_response = client.delete(f"/api/profiles/{created_id}")
    assert delete_response.status_code == 200
    deleted_state = delete_response.json()
    assert len(deleted_state["profiles"]) == 1
    assert deleted_state["selected_profile_id"] == default_id


def test_delete_last_profile_seeds_new_default(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpstat", "-p", "-d"]:
            return completed(cmd, stdout=fake_lpstat_output())
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)

    initial_state = client.get("/api/state").json()
    profile_id = initial_state["selected_profile_id"]

    response = client.delete(f"/api/profiles/{profile_id}")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["profiles"]) == 1
    assert payload["profiles"][0]["name"] == "Default label"
    assert payload["selected_profile_id"] == payload["profiles"][0]["id"]


def test_get_and_post_config_manage_queue_and_stock(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpstat", "-p", "-d"]:
            return completed(
                cmd,
                stdout=(
                    "printer QL700 is idle.\n"
                    "printer SECOND is idle.\n"
                    "system default destination: QL700\n"
                ),
            )
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)

    initial_response = client.get("/api/config")
    assert initial_response.status_code == 200
    assert initial_response.json()["queue_name"] == "QL700"
    assert initial_response.json()["stock_width_mm"] == 62.0
    assert initial_response.json()["stock_is_continuous"] is False
    assert initial_response.json()["stock_length_mm"] == 29.0

    save_response = client.post(
        "/api/config",
        json={
            "queue_name": "SECOND",
            "stock_width_mm": 62,
            "stock_is_continuous": True,
            "stock_length_mm": None,
        },
    )
    assert save_response.status_code == 200
    assert save_response.json()["queue_name"] == "SECOND"
    assert save_response.json()["stock_width_mm"] == 62.0
    assert save_response.json()["stock_is_continuous"] is True
    assert save_response.json()["stock_length_mm"] is None

    saved_state = json.loads(state.CONFIG_PATH.read_text(encoding="utf-8"))
    assert saved_state["queue_name"] == "SECOND"
    assert saved_state["stock_width_mm"] == 62.0
    assert saved_state["stock_is_continuous"] is True
    assert saved_state["stock_length_mm"] is None
    assert "profiles" in saved_state


def test_config_rounds_stock_width_to_two_decimals(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpstat", "-p", "-d"]:
            return completed(
                cmd,
                stdout="printer QL700 is idle.\nsystem default destination: QL700\n",
            )
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)

    response = client.post(
        "/api/config",
        json={
            "queue_name": "QL700",
            "stock_width_mm": 62.345,
            "stock_is_continuous": True,
            "stock_length_mm": None,
        },
    )

    assert response.status_code == 200
    assert response.json()["stock_width_mm"] == 62.35

    saved_state = json.loads(state.CONFIG_PATH.read_text(encoding="utf-8"))
    assert saved_state["stock_width_mm"] == 62.35


def test_get_config_options_returns_parsed_lpoptions(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpoptions", "-p", "Brother_QL700", "-l"]:
            return completed(
                cmd,
                stdout=(
                    "PageSize/Media Size: *62x29 62x100\n"
                    "BrPriority/Quality: *BrSpeed BrQuality\n"
                ),
            )
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)

    response = client.get("/api/config/options", params={"queue_name": "Brother_QL700"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["PageSize"]["default"] == "62x29"
    assert payload["PageSize"]["choices"] == ["62x29", "62x100"]
    assert payload["BrPriority"]["choices"] == ["BrSpeed", "BrQuality"]


def test_get_config_defaults_returns_saved_lpoptions(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpoptions", "-p", "Brother_QL700"]:
            return completed(
                cmd,
                stdout="copies=1 media=62X1 orientation-requested=3 fit-to-page=false",
            )
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)

    response = client.get("/api/config/defaults", params={"queue_name": "Brother_QL700"})

    assert response.status_code == 200
    assert response.json() == {
        "copies": "1",
        "media": "62X1",
        "orientation-requested": "3",
        "fit-to-page": "false",
    }


def test_get_queue_status_returns_job_count_for_active_queue(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.save_state(state.build_default_state(queue_name="QL700"))

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpstat", "-l", "-p", "QL700"]:
            return completed(
                cmd,
                stdout="printer QL700 is idle.  enabled since Sun Mar 29 20:40:03 2026\n",
            )
        if cmd == ["lpstat", "-o", "QL700"]:
            return completed(
                cmd,
                stdout=(
                    "QL700-17 alice 1024 Tue 30 Mar 2026 09:00:00 AM AEST\n"
                    "QL700-18 bob 2048 Tue 30 Mar 2026 09:01:00 AM AEST\n"
                ),
            )
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)

    response = client.get("/api/queue-status")

    assert response.status_code == 200
    assert response.json() == {
        "queue_name": "QL700",
        "is_detected": True,
        "is_online": True,
        "status": "idle",
        "detail": "printer QL700 is idle.  enabled since Sun Mar 29 20:40:03 2026",
        "queued_jobs": 2,
        "job_ids": ["QL700-17", "QL700-18"],
    }


def test_get_queue_status_allows_explicit_queue_name(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.save_state(state.build_default_state(queue_name="QL700"))

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpstat", "-l", "-p", "SECOND"]:
            return completed(
                cmd,
                stdout="printer SECOND is idle.  enabled since Sun Mar 29 20:40:03 2026\n",
            )
        if cmd == ["lpstat", "-o", "SECOND"]:
            return completed(cmd, stdout="")
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)

    response = client.get("/api/queue-status", params={"queue_name": "SECOND"})

    assert response.status_code == 200
    assert response.json() == {
        "queue_name": "SECOND",
        "is_detected": True,
        "is_online": True,
        "status": "idle",
        "detail": "printer SECOND is idle.  enabled since Sun Mar 29 20:40:03 2026",
        "queued_jobs": 0,
        "job_ids": [],
    }


def test_get_queue_status_marks_missing_queue_offline(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.save_state(state.build_default_state(queue_name="Brother_QL700"))

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpstat", "-l", "-p", "Brother_QL700"]:
            return completed(
                cmd,
                stderr='lpstat: Invalid destination name in list "Brother_QL700".',
                returncode=1,
            )
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)

    response = client.get("/api/queue-status")

    assert response.status_code == 200
    assert response.json() == {
        "queue_name": "Brother_QL700",
        "is_detected": False,
        "is_online": False,
        "status": "missing",
        "detail": 'lpstat: Invalid destination name in list "Brother_QL700".',
        "queued_jobs": 0,
        "job_ids": [],
    }


def test_labels_pdf_uses_authored_profile_dimensions_for_preview(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.save_state(
        state.build_default_state(queue_name="QL700").model_copy(
            update={
                "stock_width_mm": 50,
                "stock_is_continuous": False,
                "stock_length_mm": 30,
            }
        )
    )
    captured: dict[str, str] = {}

    def fake_html_to_pdf_bytes(html: str) -> bytes:
        captured["html"] = html
        return b"%PDF-test"

    monkeypatch.setattr(printpage, "html_to_pdf_bytes", fake_html_to_pdf_bytes)

    response = client.post(
        "/labels.pdf",
        json=default_profile_payload(width_mm=50, height_mm=30, quantity=1),
    )

    assert response.status_code == 200
    assert "size: 50mm 30mm;" in captured["html"]
    assert "margin: 0mm;" in captured["html"]
    assert "width: 50mm;" in captured["html"]
    assert 'row--h2 row--center row--bold' in captured["html"]
    assert "hello" in captured["html"]


def test_labels_pdf_swaps_preview_dimensions_for_landscape_orientation(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str] = {}

    def fake_html_to_pdf_bytes(html: str) -> bytes:
        captured["html"] = html
        return b"%PDF-test"

    monkeypatch.setattr(printpage, "html_to_pdf_bytes", fake_html_to_pdf_bytes)

    response = client.post(
        "/labels.pdf",
        json=default_profile_payload(
            width_mm=20,
            height_mm=62,
            orientation="landscape",
            quantity=1,
        ),
    )

    assert response.status_code == 200
    assert "size: 62mm 20mm;" in captured["html"]
    assert "width: 62mm;" in captured["html"]
    assert "height: 20mm;" in captured["html"]


def test_labels_pdf_does_not_rotate_in_preview(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.save_state(
        state.build_default_state(queue_name="QL700").model_copy(
            update={
                "stock_width_mm": 62,
                "stock_is_continuous": False,
                "stock_length_mm": 29,
            }
        )
    )
    captured: dict[str, str] = {}

    def fake_html_to_pdf_bytes(html: str) -> bytes:
        captured["html"] = html
        return b"%PDF-test"

    monkeypatch.setattr(printpage, "html_to_pdf_bytes", fake_html_to_pdf_bytes)

    response = client.post(
        "/labels.pdf",
        json=default_profile_payload(width_mm=29, height_mm=62, quantity=1),
    )

    assert response.status_code == 200
    assert "size: 29mm 62mm;" in captured["html"]
    assert "width: 29mm;" in captured["html"]
    assert "height: 62mm;" in captured["html"]
    assert "label--rotated" not in captured["html"]


def test_labels_pdf_keeps_authored_orientation_when_print_would_auto_switch(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str] = {}

    def fake_html_to_pdf_bytes(html: str) -> bytes:
        captured["html"] = html
        return b"%PDF-test"

    monkeypatch.setattr(printpage, "html_to_pdf_bytes", fake_html_to_pdf_bytes)

    response = client.post(
        "/labels.pdf",
        json=default_profile_payload(width_mm=350, height_mm=62, quantity=1),
    )

    assert response.status_code == 200
    assert "size: 350mm 62mm;" in captured["html"]
    assert "width: 350mm;" in captured["html"]
    assert "height: 62mm;" in captured["html"]


def test_print_continuous_stock_prefers_full_roll_width_for_transposed_profile(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.save_state(
        state.build_default_state(queue_name="QL700").model_copy(
            update={
                "stock_width_mm": 62,
                "stock_is_continuous": True,
                "stock_length_mm": None,
            }
        )
    )
    captured: dict[str, str] = {}
    commands: list[list[str]] = []

    def fake_html_to_pdf_bytes(html: str) -> bytes:
        captured["html"] = html
        return b"%PDF-test"

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        commands.append(cmd)
        if cmd == ["lpoptions", "-p", "QL700", "-l"]:
            return completed(
                cmd,
                stdout=(
                    "PageSize/Media Size: *62x29 62X1 62x100\n"
                    "BrCutLabel/Cut Label: *1 2 3\n"
                    "BrPriority/Quality: BrSpeed *BrQuality\n"
                ),
            )
        if cmd[:4] == ["sudo", "/usr/sbin/lpadmin", "-p", "QL700"]:
            return completed(cmd, stdout="applied\n")
        if cmd[:2] == ["lp", "-d"]:
            return completed(cmd, stdout="request id is QL700-1\n")
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printpage, "html_to_pdf_bytes", fake_html_to_pdf_bytes)
    monkeypatch.setattr(printer, "run_command", fake_run_command)

    response = client.post(
        "/print",
        json=default_profile_payload(width_mm=40, height_mm=62, quantity=1),
    )

    assert response.status_code == 200
    assert "size: 40mm 61mm;" in captured["html"]
    assert "width: 40mm;" in captured["html"]
    assert "height: 61mm;" in captured["html"]
    assert "label--rotated" not in captured["html"]
    assert "PageSize=62x40" in commands[1]
    assert "media=62x40" in commands[1]
    assert "orientation-requested=4" in commands[1]
    assert_neutral_print_options(commands[1])
    assert "media=62x40" in commands[2]
    assert "orientation-requested=4" in commands[2]
    assert_neutral_print_options(commands[2])


def test_print_continuous_stock_trims_exact_roll_width_by_one_mm(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.save_state(
        state.build_default_state(queue_name="QL700").model_copy(
            update={
                "stock_width_mm": 62,
                "stock_is_continuous": True,
                "stock_length_mm": None,
            }
        )
    )
    captured: dict[str, str] = {}
    commands: list[list[str]] = []

    def fake_html_to_pdf_bytes(html: str) -> bytes:
        captured["html"] = html
        return b"%PDF-test"

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        commands.append(cmd)
        if cmd == ["lpoptions", "-p", "QL700", "-l"]:
            return completed(
                cmd,
                stdout=(
                    "PageSize/Media Size: *62x29 62X1 62x100\n"
                    "BrCutLabel/Cut Label: *1 2 3\n"
                    "BrPriority/Quality: BrSpeed *BrQuality\n"
                ),
            )
        if cmd[:4] == ["sudo", "/usr/sbin/lpadmin", "-p", "QL700"]:
            return completed(cmd, stdout="applied\n")
        if cmd[:2] == ["lp", "-d"]:
            return completed(cmd, stdout="request id is QL700-1\n")
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printpage, "html_to_pdf_bytes", fake_html_to_pdf_bytes)
    monkeypatch.setattr(printer, "run_command", fake_run_command)

    response = client.post(
        "/print",
        json=default_profile_payload(width_mm=62, height_mm=40, quantity=1),
    )

    assert response.status_code == 200
    assert "size: 61mm 40mm;" in captured["html"]
    assert "width: 61mm;" in captured["html"]
    assert "height: 40mm;" in captured["html"]
    assert "PageSize=62x40" in commands[1]
    assert "media=62x40" in commands[1]
    assert "orientation-requested=3" in commands[1]
    assert_neutral_print_options(commands[1])
    assert "media=62x40" in commands[2]
    assert "orientation-requested=3" in commands[2]
    assert_neutral_print_options(commands[2])


def test_print_uses_explicit_landscape_orientation_without_auto_rotation(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.save_state(
        state.build_default_state(queue_name="QL700").model_copy(
            update={
                "stock_width_mm": 62,
                "stock_is_continuous": False,
                "stock_length_mm": 29,
            }
        )
    )
    captured: dict[str, str] = {}

    def fake_html_to_pdf_bytes(html: str) -> bytes:
        captured["html"] = html
        return b"%PDF-test"

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpoptions", "-p", "QL700", "-l"]:
            return completed(
                cmd,
                stdout=(
                    "PageSize/Media Size: *62x29 62X1 62x100\n"
                    "BrCutLabel/Cut Label: *1 2 3\n"
                    "BrPriority/Quality: BrSpeed *BrQuality\n"
                ),
            )
        if cmd[:4] == ["sudo", "/usr/sbin/lpadmin", "-p", "QL700"]:
            return completed(cmd, stdout="applied\n")
        if cmd[:2] == ["lp", "-d"]:
            return completed(cmd, stdout="request id is QL700-1\n")
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printpage, "html_to_pdf_bytes", fake_html_to_pdf_bytes)
    monkeypatch.setattr(printer, "run_command", fake_run_command)

    response = client.post(
        "/print",
        json=default_profile_payload(
            width_mm=29,
            height_mm=62,
            orientation="landscape",
            quantity=1,
        ),
    )

    assert response.status_code == 200
    assert "size: 62mm 29mm;" in captured["html"]
    assert "width: 62mm;" in captured["html"]
    assert "height: 29mm;" in captured["html"]
    assert "label--rotated" not in captured["html"]


def test_labels_pdf_renders_optional_border(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str] = {}

    def fake_html_to_pdf_bytes(html: str) -> bytes:
        captured["html"] = html
        return b"%PDF-test"

    monkeypatch.setattr(printpage, "html_to_pdf_bytes", fake_html_to_pdf_bytes)

    response = client.post(
        "/labels.pdf",
        json=default_profile_payload(
            border={
                "enabled": True,
                "thickness_mm": 0.7,
                "inset_mm": 1.2,
                "radius_mm": 2.5,
            },
            quantity=1,
        ),
    )

    assert response.status_code == 200
    assert "border: 0.7mm solid #000;" in captured["html"]
    assert "top: 1.2mm;" in captured["html"]
    assert "border-radius: 2.5mm;" in captured["html"]


def test_labels_pdf_renders_italic_rows_with_visible_slant(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str] = {}

    def fake_html_to_pdf_bytes(html: str) -> bytes:
        captured["html"] = html
        return b"%PDF-test"

    monkeypatch.setattr(printpage, "html_to_pdf_bytes", fake_html_to_pdf_bytes)

    response = client.post(
        "/labels.pdf",
        json=default_profile_payload(
            rows=[
                {
                    "text": "italic",
                    "level": "normal",
                    "bold": False,
                    "italic": True,
                    "alignment": "center",
                }
            ],
            quantity=1,
        ),
    )

    assert response.status_code == 200
    assert '"DejaVu Sans", "Liberation Sans", "Noto Sans", Arial, sans-serif' in captured["html"]
    assert "transform: skewX(-12deg);" in captured["html"]
    assert 'row--normal row--center row--italic' in captured["html"]


def test_print_applies_profile_then_submits_lp_job(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.save_state(state.build_default_state(queue_name="QL700"))

    commands: list[list[str]] = []

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        commands.append(cmd)
        if cmd == ["lpoptions", "-p", "QL700", "-l"]:
            return completed(
                cmd,
                stdout=(
                    "PageSize/Media Size: *62x29 62X1 62x100\n"
                    "BrCutLabel/Cut Label: *1 2 3\n"
                    "BrPriority/Quality: BrSpeed *BrQuality\n"
                ),
            )
        if cmd[:4] == ["sudo", "/usr/sbin/lpadmin", "-p", "QL700"]:
            return completed(cmd, stdout="applied\n")
        if cmd[:2] == ["lp", "-d"]:
            return completed(cmd, stdout="request id is QL700-1\n")
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)
    monkeypatch.setattr(printpage, "html_to_pdf_bytes", lambda html: b"%PDF-test")

    response = client.post("/print", json=default_profile_payload(quantity=3))

    assert response.status_code == 200
    assert response.json()["queue"] == "QL700"
    assert commands[0] == ["lpoptions", "-p", "QL700", "-l"]
    assert commands[1] == [
        "sudo",
        "/usr/sbin/lpadmin",
        "-p",
        "QL700",
        "-o",
        "PageSize=62x29",
        "-o",
        "media=62x29",
        "-o",
        "orientation-requested=3",
        "-o",
        "fit-to-page=false",
        "-o",
        "scaling=100",
        "-o",
        "number-up=1",
        "-o",
        "BrCutLabel=1",
        "-o",
        "BrCutAtEnd=ON",
        "-o",
        "BrPriority=BrQuality",
    ]
    assert commands[2][0:4] == ["lp", "-d", "QL700", "-n"]
    assert commands[2][4] == "3"
    assert commands[2][5:15] == [
        "-o",
        "media=62x29",
        "-o",
        "orientation-requested=3",
        "-o",
        "fit-to-page=false",
        "-o",
        "scaling=100",
        "-o",
        "number-up=1",
    ]
    assert commands[2][15:21] == [
        "-o",
        "BrCutLabel=1",
        "-o",
        "BrCutAtEnd=ON",
        "-o",
        "BrPriority=BrQuality",
    ]


def test_print_supports_quality_option_named_quality(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.save_state(state.build_default_state(queue_name="QL700"))

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpoptions", "-p", "QL700", "-l"]:
            return completed(
                cmd,
                stdout=(
                    "BrCutLabel/Cut Label: *1 2\n"
                    "Quality/Quality: *BrSpeed BrQuality\n"
                ),
            )
        if cmd[:4] == ["sudo", "/usr/sbin/lpadmin", "-p", "QL700"]:
            assert "orientation-requested=3" in cmd
            assert_neutral_print_options(cmd)
            assert cmd[-1] == "Quality=BrSpeed"
            return completed(cmd, stdout="applied\n")
        if cmd[:2] == ["lp", "-d"]:
            assert "orientation-requested=3" in cmd
            assert_neutral_print_options(cmd)
            return completed(cmd, stdout="request id is QL700-1\n")
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)
    monkeypatch.setattr(printpage, "html_to_pdf_bytes", lambda html: b"%PDF-test")

    response = client.post("/print", json=default_profile_payload(quality="BrSpeed", quantity=1))

    assert response.status_code == 200


def test_print_auto_switches_continuous_stock_to_fit_loaded_roll(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.save_state(
        state.build_default_state(queue_name="QL700").model_copy(
            update={
                "stock_width_mm": 62,
                "stock_is_continuous": True,
                "stock_length_mm": None,
            }
        )
    )

    captured: dict[str, str] = {}
    commands: list[list[str]] = []

    def fake_html_to_pdf_bytes(html: str) -> bytes:
        captured["html"] = html
        return b"%PDF-test"

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        commands.append(cmd)
        if cmd == ["lpoptions", "-p", "QL700", "-l"]:
            return completed(
                cmd,
                stdout=(
                    "PageSize/Media Size: *62x29 62X1 62x100\n"
                    "BrCutLabel/Cut Label: *1 2 3\n"
                    "BrPriority/Quality: BrSpeed *BrQuality\n"
                ),
            )
        if cmd[:4] == ["sudo", "/usr/sbin/lpadmin", "-p", "QL700"]:
            return completed(cmd, stdout="applied\n")
        if cmd[:2] == ["lp", "-d"]:
            return completed(cmd, stdout="request id is QL700-1\n")
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)
    monkeypatch.setattr(printpage, "html_to_pdf_bytes", fake_html_to_pdf_bytes)

    response = client.post(
        "/print",
        json=default_profile_payload(width_mm=350, height_mm=62, quantity=1),
    )

    assert response.status_code == 200
    assert "size: 350mm 61mm;" in captured["html"]
    assert "width: 350mm;" in captured["html"]
    assert "height: 61mm;" in captured["html"]
    assert commands[1] == [
        "sudo",
        "/usr/sbin/lpadmin",
        "-p",
        "QL700",
        "-o",
        "PageSize=62x350",
        "-o",
        "media=62x350",
        "-o",
        "orientation-requested=4",
        "-o",
        "fit-to-page=false",
        "-o",
        "scaling=100",
        "-o",
        "number-up=1",
        "-o",
        "BrCutLabel=1",
        "-o",
        "BrCutAtEnd=ON",
        "-o",
        "BrPriority=BrQuality",
    ]
    assert commands[2][5:15] == [
        "-o",
        "media=62x350",
        "-o",
        "orientation-requested=4",
        "-o",
        "fit-to-page=false",
        "-o",
        "scaling=100",
        "-o",
        "number-up=1",
    ]
    assert commands[2][15:21] == [
        "-o",
        "BrCutLabel=1",
        "-o",
        "BrCutAtEnd=ON",
        "-o",
        "BrPriority=BrQuality",
    ]


def test_print_prefers_exact_roll_width_when_both_continuous_orientations_fit(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.save_state(
        state.build_default_state(queue_name="QL700").model_copy(
            update={
                "stock_width_mm": 61.98,
                "stock_is_continuous": True,
                "stock_length_mm": None,
            }
        )
    )

    captured: dict[str, str] = {}
    commands: list[list[str]] = []

    def fake_html_to_pdf_bytes(html: str) -> bytes:
        captured["html"] = html
        return b"%PDF-test"

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        commands.append(cmd)
        if cmd == ["lpoptions", "-p", "QL700", "-l"]:
            return completed(
                cmd,
                stdout=(
                    "PageSize/Media Size: *62x29 61.98X1 62X1 62x100\n"
                    "BrCutLabel/Cut Label: *1 2 3\n"
                    "BrPriority/Quality: BrSpeed *BrQuality\n"
                ),
            )
        if cmd[:4] == ["sudo", "/usr/sbin/lpadmin", "-p", "QL700"]:
            return completed(cmd, stdout="applied\n")
        if cmd[:2] == ["lp", "-d"]:
            return completed(cmd, stdout="request id is QL700-1\n")
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)
    monkeypatch.setattr(printpage, "html_to_pdf_bytes", fake_html_to_pdf_bytes)

    response = client.post(
        "/print",
        json=default_profile_payload(width_mm=22, height_mm=61.98, quantity=1),
    )

    assert response.status_code == 200
    assert "size: 22mm 60.98mm;" in captured["html"]
    assert "width: 22mm;" in captured["html"]
    assert "height: 60.98mm;" in captured["html"]
    assert "PageSize=61.98x22" in commands[1]
    assert "media=61.98x22" in commands[1]
    assert "orientation-requested=4" in commands[1]
    assert_neutral_print_options(commands[1])
    assert "media=61.98x22" in commands[2]
    assert "orientation-requested=4" in commands[2]
    assert_neutral_print_options(commands[2])


def test_print_sets_landscape_orientation_request_for_landscape_jobs(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.save_state(
        state.build_default_state(queue_name="QL700").model_copy(
            update={
                "stock_width_mm": 62,
                "stock_is_continuous": True,
                "stock_length_mm": None,
            }
        )
    )

    commands: list[list[str]] = []

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        commands.append(cmd)
        if cmd == ["lpoptions", "-p", "QL700", "-l"]:
            return completed(
                cmd,
                stdout=(
                    "PageSize/Media Size: *62x29 62X1 62x100\n"
                    "BrCutLabel/Cut Label: *1 2 3\n"
                    "BrPriority/Quality: BrSpeed *BrQuality\n"
                ),
            )
        if cmd[:4] == ["sudo", "/usr/sbin/lpadmin", "-p", "QL700"]:
            return completed(cmd, stdout="applied\n")
        if cmd[:2] == ["lp", "-d"]:
            return completed(cmd, stdout="request id is QL700-1\n")
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)
    monkeypatch.setattr(printpage, "html_to_pdf_bytes", lambda html: b"%PDF-test")

    response = client.post(
        "/print",
        json=default_profile_payload(
            width_mm=62,
            height_mm=40,
            orientation="landscape",
            quantity=1,
        ),
    )

    assert response.status_code == 200
    assert "PageSize=62x40" in commands[1]
    assert "media=62x40" in commands[1]
    assert "orientation-requested=3" in commands[1]
    assert_neutral_print_options(commands[1])
    assert "media=62x40" in commands[2]
    assert "orientation-requested=3" in commands[2]
    assert_neutral_print_options(commands[2])


def test_print_rejects_unsupported_cut_value(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.save_state(state.build_default_state(queue_name="QL700"))

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpoptions", "-p", "QL700", "-l"]:
            return completed(
                cmd,
                stdout=(
                    "BrCutLabel/Cut Label: *1 2\n"
                    "BrPriority/Quality: *BrSpeed BrQuality\n"
                ),
            )
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)

    response = client.post("/print", json=default_profile_payload(cut_every=4))

    assert response.status_code == 400
    assert "BrCutLabel=4" in response.json()["detail"]


def test_print_rejects_unsupported_quality_value(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.save_state(state.build_default_state(queue_name="QL700"))

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpoptions", "-p", "QL700", "-l"]:
            return completed(
                cmd,
                stdout=(
                    "BrCutLabel/Cut Label: *1 2\n"
                    "BrPriority/Quality: *BrSpeed\n"
                ),
            )
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)

    response = client.post("/print", json=default_profile_payload(quality="BrQuality"))

    assert response.status_code == 400
    assert "BrPriority=BrQuality" in response.json()["detail"]


def test_profile_dimensions_validate(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(printpage, "html_to_pdf_bytes", lambda html: b"%PDF-test")

    fixed_response = client.post("/labels.pdf", json=default_profile_payload(quantity=1))
    long_response = client.post(
        "/labels.pdf",
        json=default_profile_payload(height_mm=100, quantity=1),
    )
    invalid_response = client.post(
        "/labels.pdf",
        json=default_profile_payload(height_mm=0, quantity=1),
    )

    assert fixed_response.status_code == 200
    assert long_response.status_code == 200
    assert invalid_response.status_code == 422


def test_profiles_require_at_least_one_row(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(printpage, "html_to_pdf_bytes", lambda html: b"%PDF-test")

    empty_rows = client.post(
        "/labels.pdf",
        json=default_profile_payload(rows=[], quantity=1),
    )
    blank_text = client.post(
        "/labels.pdf",
        json=default_profile_payload(
            rows=[
                {
                    "text": "   ",
                    "level": "normal",
                    "bold": False,
                    "italic": False,
                    "alignment": "left",
                }
            ],
            quantity=1,
        ),
    )

    assert empty_rows.status_code == 422
    assert blank_text.status_code == 200


def test_invalid_saved_state_falls_back_to_default_profile(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.CONFIG_PATH.write_text(
        json.dumps(
            {
                "queue_name": "QL700",
                "selected_profile_id": None,
                "profiles": [
                    {
                        "id": "legacy",
                        "name": "Legacy",
                        "title": "old",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpstat", "-p", "-d"]:
            return completed(cmd, stdout=fake_lpstat_output())
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)

    response = client.get("/api/state")

    assert response.status_code == 200
    payload = response.json()
    assert payload["profiles"][0]["name"] == "Default label"
    assert payload["profiles"][0]["rows"][0]["text"] == "New label"


def test_legacy_saved_state_is_backfilled_with_default_stock(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state.CONFIG_PATH.write_text(
        json.dumps(
            {
                "queue_name": "QL700",
                "selected_profile_id": "legacy",
                "profiles": [
                    {
                        "id": "legacy",
                        "name": "Legacy",
                        "rows": [{"text": "old", "level": "normal", "alignment": "left"}],
                        "border": {
                            "enabled": False,
                            "thickness_mm": 0.5,
                            "inset_mm": 1.0,
                            "radius_mm": 1.5,
                        },
                        "width_mm": 62,
                        "height_mm": 29,
                        "is_continuous": False,
                        "cut_every": 1,
                        "quality": "BrQuality",
                        "quantity": 1,
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpstat", "-p", "-d"]:
            return completed(cmd, stdout=fake_lpstat_output())
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)

    response = client.get("/api/state")

    assert response.status_code == 200
    payload = response.json()
    assert payload["stock_width_mm"] == 62.0
    assert payload["stock_is_continuous"] is False
    assert payload["stock_length_mm"] == 29.0

    saved_state = json.loads(state.CONFIG_PATH.read_text(encoding="utf-8"))
    assert saved_state["stock_width_mm"] == 62.0
    assert saved_state["stock_is_continuous"] is False
    assert saved_state["stock_length_mm"] == 29.0


def test_profile_save_does_not_require_printer_listing(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpstat", "-p", "-d"]:
            return completed(cmd, stderr="lpstat unavailable", returncode=1)
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)

    response = client.post("/api/profiles", json=default_profile_payload())

    assert response.status_code == 200
    payload = response.json()
    assert payload["queue_name"] == "Brother_QL700"
    assert len(payload["profiles"]) == 2
