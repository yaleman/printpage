import json
import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import printpage
from printpage import printer, state


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
        "is_continuous": False,
        "cut_every": 1,
        "quality": "BrQuality",
        "quantity": 2,
    }
    payload.update(overrides)
    return payload


def fake_lpstat_output() -> str:
    return "printer QL700 is idle.\nsystem default destination: QL700\n"


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


def test_get_api_state_seeds_default_profile_without_printer_lookup(
    client: TestClient,
) -> None:
    response = client.get("/api/state")

    assert response.status_code == 200
    payload = response.json()
    assert payload["queue_name"] == "Brother_QL700"
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
    assert "previewPdf" in js_response.text


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


def test_get_and_post_config_manage_queue_only(
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

    save_response = client.post("/api/config", json={"queue_name": "SECOND"})
    assert save_response.status_code == 200
    assert save_response.json()["queue_name"] == "SECOND"

    saved_state = json.loads(state.CONFIG_PATH.read_text(encoding="utf-8"))
    assert saved_state["queue_name"] == "SECOND"
    assert "profiles" in saved_state


def test_labels_pdf_uses_payload_dimensions(
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
        json=default_profile_payload(width_mm=50, height_mm=30, quantity=1),
    )

    assert response.status_code == 200
    assert "size: 50mm 30mm;" in captured["html"]
    assert "margin: 0mm;" in captured["html"]
    assert "width: 50mm;" in captured["html"]
    assert 'row--h2 row--center row--bold' in captured["html"]
    assert "hello" in captured["html"]


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
        "BrCutLabel=1",
        "-o",
        "BrCutAtEnd=ON",
        "-o",
        "BrPriority=BrQuality",
    ]
    assert commands[2][0:4] == ["lp", "-d", "QL700", "-n"]
    assert commands[2][4] == "3"


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
            assert cmd[-1] == "Quality=BrSpeed"
            return completed(cmd, stdout="applied\n")
        if cmd[:2] == ["lp", "-d"]:
            return completed(cmd, stdout="request id is QL700-1\n")
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printer, "run_command", fake_run_command)
    monkeypatch.setattr(printpage, "html_to_pdf_bytes", lambda html: b"%PDF-test")

    response = client.post("/print", json=default_profile_payload(quality="BrSpeed", quantity=1))

    assert response.status_code == 200


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


def test_continuous_and_fixed_size_profiles_validate(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(printpage, "html_to_pdf_bytes", lambda html: b"%PDF-test")

    fixed_response = client.post("/labels.pdf", json=default_profile_payload(quantity=1))
    continuous_response = client.post(
        "/labels.pdf",
        json=default_profile_payload(is_continuous=True, height_mm=100, quantity=1),
    )
    invalid_response = client.post(
        "/labels.pdf",
        json=default_profile_payload(height_mm=0, quantity=1),
    )

    assert fixed_response.status_code == 200
    assert continuous_response.status_code == 200
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
