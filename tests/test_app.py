import json
import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import printpage


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(printpage, "CONFIG_PATH", tmp_path / "printpage.json")
    return TestClient(printpage.app)


def completed(cmd: list[str], stdout: str = "", stderr: str = "", returncode: int = 0) -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(cmd, returncode, stdout=stdout, stderr=stderr)


def test_parse_lpstat_destinations() -> None:
    output = """printer QL700 is idle.  enabled since Sun Mar 29 20:40:03 2026
printer BOGPRINTER is idle.  enabled since Thu Sep 18 15:38:31 2025
system default destination: QL700
"""

    queues, default_queue = printpage.parse_lpstat_destinations(output)

    assert queues == ["QL700", "BOGPRINTER"]
    assert default_queue == "QL700"


def test_parse_lpoptions_values() -> None:
    output = "copies=1 printer-make-and-model='Generic PostScript Printer' media=62x29 BrCutAtEnd=ON"

    parsed = printpage.parse_lpoptions_values(output)

    assert parsed["copies"] == "1"
    assert parsed["printer-make-and-model"] == "Generic PostScript Printer"
    assert parsed["media"] == "62x29"
    assert parsed["BrCutAtEnd"] == "ON"


def test_parse_lpoptions_choices() -> None:
    output = """PageSize/Media Size: *62x29 62x100
BrCutLabel/Cut Label: 0 *1
BrCutAtEnd/Cut At End: *ON OFF
"""

    parsed = printpage.parse_lpoptions_choices(output)

    assert parsed["PageSize"]["default"] == "62x29"
    assert parsed["PageSize"]["choices"] == ["62x29", "62x100"]
    assert parsed["BrCutLabel"]["default"] == "1"
    assert parsed["BrCutAtEnd"]["default"] == "ON"


def test_get_api_config_seeds_from_default_queue(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpstat", "-p", "-d"]:
            return completed(
                cmd,
                stdout="printer QL700 is idle.\nsystem default destination: QL700\n",
            )
        if cmd == ["lpoptions", "-p", "QL700"]:
            return completed(cmd, stdout="media=62x29 BrCutLabel=1 BrCutAtEnd=ON\n")
        if cmd == ["lpoptions", "-p", "QL700", "-l"]:
            return completed(
                cmd,
                stdout=(
                    "PageSize/Media Size: *62x29 62x100\n"
                    "media/Media: *62x29 62x100\n"
                    "BrCutLabel/Cut Label: 0 *1\n"
                    "BrCutAtEnd/Cut At End: OFF *ON\n"
                ),
            )
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printpage, "run_command", fake_run_command)

    response = client.get("/api/config")

    assert response.status_code == 200
    payload = response.json()
    assert payload["saved_config"] == {
        "queue_name": "QL700",
        "page_size": "62x29",
        "media": "62x29",
        "br_cut_label": "1",
        "br_cut_at_end": "ON",
    }
    assert payload["live_config"]["queue_name"] == "QL700"
    assert payload["queues"] == ["QL700"]
    assert payload["default_queue"] == "QL700"


def test_post_api_config_writes_json(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpstat", "-p", "-d"]:
            return completed(
                cmd,
                stdout="printer QL700 is idle.\nsystem default destination: QL700\n",
            )
        if cmd == ["lpoptions", "-p", "QL700"]:
            return completed(cmd, stdout="media=62x29 BrCutLabel=1 BrCutAtEnd=ON\n")
        if cmd == ["lpoptions", "-p", "QL700", "-l"]:
            return completed(
                cmd,
                stdout=(
                    "PageSize/Media Size: *62x29 62x100\n"
                    "media/Media: *62x29 62x100\n"
                    "BrCutLabel/Cut Label: 0 *1\n"
                    "BrCutAtEnd/Cut At End: OFF *ON\n"
                ),
            )
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printpage, "run_command", fake_run_command)

    response = client.post(
        "/api/config",
        json={
            "queue_name": "QL700",
            "page_size": "62x29",
            "media": "62x29",
            "br_cut_label": "1",
            "br_cut_at_end": "ON",
        },
    )

    assert response.status_code == 200
    assert json.loads(printpage.CONFIG_PATH.read_text(encoding="utf-8")) == {
        "br_cut_at_end": "ON",
        "br_cut_label": "1",
        "media": "62x29",
        "page_size": "62x29",
        "queue_name": "QL700",
    }


def test_sync_updates_json_from_live_values(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpoptions", "-p", "QL700"]:
            return completed(cmd, stdout="")
        if cmd == ["lpoptions", "-p", "QL700", "-l"]:
            return completed(
                cmd,
                stdout=(
                    "PageSize/Media Size: 29x90 *62x29\n"
                    "BrCutLabel/Cut Label: 0 *1\n"
                    "BrCutAtEnd/Cut At End: OFF *ON\n"
                ),
            )
        if cmd == ["lpstat", "-p", "-d"]:
            return completed(
                cmd,
                stdout="printer QL700 is idle.\nsystem default destination: QL700\n",
            )
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printpage, "run_command", fake_run_command)

    response = client.post("/api/config/sync", json={"queue_name": "QL700"})

    assert response.status_code == 200
    payload = json.loads(printpage.CONFIG_PATH.read_text(encoding="utf-8"))
    assert payload == {
        "br_cut_at_end": "ON",
        "br_cut_label": "1",
        "media": "62x29",
        "page_size": "62x29",
        "queue_name": "QL700",
    }


def test_apply_runs_lpadmin_with_expected_args(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    commands: list[list[str]] = []

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        commands.append(cmd)
        if cmd == ["lpstat", "-p", "-d"]:
            return completed(
                cmd,
                stdout="printer QL700 is idle.\nsystem default destination: QL700\n",
            )
        if cmd == ["lpoptions", "-p", "QL700"]:
            return completed(
                cmd,
                stdout="PageSize=62x29 media=62x29 BrCutLabel=1 BrCutAtEnd=ON\n",
            )
        if cmd == ["lpoptions", "-p", "QL700", "-l"]:
            return completed(
                cmd,
                stdout=(
                    "PageSize/Media Size: *62x29 62x100\n"
                    "media/Media: *62x29 62x100\n"
                    "BrCutLabel/Cut Label: 0 *1\n"
                    "BrCutAtEnd/Cut At End: OFF *ON\n"
                ),
            )
        if cmd[:4] == ["sudo", "/usr/sbin/lpadmin", "-p", "QL700"]:
            return completed(cmd, stdout="applied\n")
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printpage, "run_command", fake_run_command)

    response = client.post(
        "/api/config/apply",
        json={
            "queue_name": "QL700",
            "page_size": "62x29",
            "media": "62x29",
            "br_cut_label": "1",
            "br_cut_at_end": "ON",
        },
    )

    assert response.status_code == 200
    assert [
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
    ] in commands


def test_apply_failure_returns_500(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd[:4] == ["sudo", "/usr/sbin/lpadmin", "-p", "QL700"]:
            return completed(cmd, stderr="lpadmin failed", returncode=1)
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printpage, "run_command", fake_run_command)

    response = client.post(
        "/api/config/apply",
        json={
            "queue_name": "QL700",
            "page_size": "62x29",
            "media": "62x29",
            "br_cut_label": "1",
            "br_cut_at_end": "ON",
        },
    )

    assert response.status_code == 500
    assert "lpadmin failed" in response.json()["detail"]
    assert printpage.CONFIG_PATH.exists()


def test_queue_not_found_returns_404(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpstat", "-p", "-d"]:
            return completed(
                cmd,
                stdout="printer QL700 is idle.\nsystem default destination: QL700\n",
            )
        if cmd == ["lpoptions", "-p", "MISSING"]:
            return completed(cmd, stderr="Unknown destination", returncode=1)
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printpage, "run_command", fake_run_command)

    response = client.get("/api/config", params={"queue_name": "MISSING"})

    assert response.status_code == 404
    assert "Unknown destination" in response.json()["detail"]


def test_print_uses_configured_queue(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    printpage.CONFIG_PATH.write_text(
        json.dumps(
            {
                "queue_name": "QL700",
                "page_size": "62x29",
                "media": "62x29",
                "br_cut_label": "1",
                "br_cut_at_end": "ON",
            }
        ),
        encoding="utf-8",
    )

    commands: list[list[str]] = []

    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        commands.append(cmd)
        if cmd[:2] == ["lp", "-d"]:
            return completed(cmd, stdout="request id is QL700-1\n")
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printpage, "run_command", fake_run_command)
    monkeypatch.setattr(printpage, "html_to_pdf_bytes", lambda html: b"%PDF-test")

    response = client.post(
        "/print",
        json={
            "title": "hello",
            "subtitle": "world",
            "body": "body",
            "copies": 2,
        },
    )

    assert response.status_code == 200
    assert response.json()["queue"] == "QL700"
    assert commands[0][0:4] == ["lp", "-d", "QL700", "-n"]


def test_labels_pdf_uses_configured_page_size(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    printpage.CONFIG_PATH.write_text(
        json.dumps(
            {
                "queue_name": "QL700",
                "page_size": "50x30",
                "media": "50x30",
                "br_cut_label": "1",
                "br_cut_at_end": "ON",
            }
        ),
        encoding="utf-8",
    )

    captured: dict[str, str] = {}

    def fake_html_to_pdf_bytes(html: str) -> bytes:
        captured["html"] = html
        return b"%PDF-test"

    monkeypatch.setattr(printpage, "html_to_pdf_bytes", fake_html_to_pdf_bytes)

    response = client.post(
        "/labels.pdf",
        json={
            "title": "hello",
            "subtitle": "world",
            "body": "body",
            "copies": 1,
        },
    )

    assert response.status_code == 200
    assert "size: 50mm 30mm;" in captured["html"]
    assert "width: 46mm;" in captured["html"]


def test_labels_pdf_falls_back_to_default_size_for_named_media(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    printpage.CONFIG_PATH.write_text(
        json.dumps(
            {
                "queue_name": "QL700",
                "page_size": "Letter",
                "media": "Letter",
                "br_cut_label": "1",
                "br_cut_at_end": "ON",
            }
        ),
        encoding="utf-8",
    )

    captured: dict[str, str] = {}

    def fake_html_to_pdf_bytes(html: str) -> bytes:
        captured["html"] = html
        return b"%PDF-test"

    monkeypatch.setattr(printpage, "html_to_pdf_bytes", fake_html_to_pdf_bytes)

    response = client.post(
        "/labels.pdf",
        json={
            "title": "hello",
            "subtitle": "world",
            "body": "body",
            "copies": 1,
        },
    )

    assert response.status_code == 200
    assert "size: 62mm 29mm;" in captured["html"]


def test_get_api_config_handles_missing_brother_options(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
        if cmd == ["lpstat", "-p", "-d"]:
            return completed(
                cmd,
                stdout="printer QL700 is idle.\nsystem default destination: QL700\n",
            )
        if cmd == ["lpoptions", "-p", "QL700"]:
            return completed(cmd, stdout="")
        if cmd == ["lpoptions", "-p", "QL700", "-l"]:
            return completed(cmd, stdout="PageSize/Media Size: *62x29 62x100\n")
        raise AssertionError(f"Unexpected command: {cmd}")

    monkeypatch.setattr(printpage, "run_command", fake_run_command)

    response = client.get("/api/config")

    assert response.status_code == 200
    payload = response.json()
    assert payload["live_config"]["page_size"] == "62x29"
    assert payload["live_config"]["media"] == "62x29"
    assert payload["live_config"]["br_cut_label"] == "1"
    assert payload["live_config"]["br_cut_at_end"] == "ON"
