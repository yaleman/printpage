import json
import re
import shlex
import subprocess
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel, Field, field_validator

app = FastAPI()

REPO_ROOT = Path(__file__).resolve().parent.parent
PACKAGE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = PACKAGE_DIR / "templates"
CONFIG_PATH = REPO_ROOT / "printpage.json"
DEFAULT_QUEUE_NAME = "Brother_QL700"
DEFAULT_PAGE_SIZE = "62x29"
DEFAULT_MEDIA = "62x29"
DEFAULT_BR_CUT_LABEL = "1"
DEFAULT_BR_CUT_AT_END = "ON"
LABEL_MARGIN_MM = 2.0
MEDIA_SIZE_RE = re.compile(r"^(?P<width>\d+(?:\.\d+)?)x(?P<height>\d+(?:\.\d+)?)$")

templates = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


class LabelRequest(BaseModel):
    title: str = Field(..., max_length=100)
    subtitle: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, max_length=1000)
    copies: int = Field(default=1, ge=1, le=20)


class PrinterConfig(BaseModel):
    queue_name: str = Field(..., min_length=1, max_length=200)
    page_size: str = Field(default=DEFAULT_PAGE_SIZE, min_length=1, max_length=100)
    media: str = Field(default=DEFAULT_MEDIA, min_length=1, max_length=100)
    br_cut_label: str = Field(default=DEFAULT_BR_CUT_LABEL)
    br_cut_at_end: str = Field(default=DEFAULT_BR_CUT_AT_END)

    @field_validator("queue_name", "page_size", "media", mode="before")
    @classmethod
    def strip_required_strings(cls, value: str) -> str:
        cleaned = str(value).strip()
        if not cleaned:
            raise ValueError("value cannot be empty")
        return cleaned

    @field_validator("br_cut_label", mode="before")
    @classmethod
    def validate_cut_label(cls, value: str) -> str:
        cleaned = str(value).strip()
        if cleaned not in {"0", "1"}:
            raise ValueError("BrCutLabel must be 0 or 1")
        return cleaned

    @field_validator("br_cut_at_end", mode="before")
    @classmethod
    def validate_cut_at_end(cls, value: str) -> str:
        cleaned = str(value).strip().upper()
        if cleaned not in {"ON", "OFF"}:
            raise ValueError("BrCutAtEnd must be ON or OFF")
        return cleaned


class SyncRequest(BaseModel):
    queue_name: str = Field(..., min_length=1, max_length=200)

    @field_validator("queue_name", mode="before")
    @classmethod
    def strip_queue_name(cls, value: str) -> str:
        cleaned = str(value).strip()
        if not cleaned:
            raise ValueError("queue_name cannot be empty")
        return cleaned


def run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=True, text=True)


def mm_to_css(value: float) -> str:
    return f"{value:g}"


def parse_media_size_mm(value: str) -> tuple[float, float]:
    match = MEDIA_SIZE_RE.fullmatch(value.strip())
    if not match:
        raise ValueError(f"Unsupported media size format: {value}")

    width = float(match.group("width"))
    height = float(match.group("height"))
    return width, height


def label_dimensions_mm(page_size: str) -> dict[str, str]:
    try:
        width_mm, height_mm = parse_media_size_mm(page_size)
    except ValueError:
        width_mm, height_mm = parse_media_size_mm(DEFAULT_PAGE_SIZE)

    label_width = max(width_mm - (LABEL_MARGIN_MM * 2), 1.0)
    label_height = max(height_mm - (LABEL_MARGIN_MM * 2), 1.0)
    return {
        "page_width_mm": mm_to_css(width_mm),
        "page_height_mm": mm_to_css(height_mm),
        "label_width_mm": mm_to_css(label_width),
        "label_height_mm": mm_to_css(label_height),
        "margin_mm": mm_to_css(LABEL_MARGIN_MM),
    }


def parse_lpstat_destinations(output: str) -> tuple[list[str], str | None]:
    queues: list[str] = []
    default_queue: str | None = None

    for line in output.splitlines():
        line = line.strip()
        if line.startswith("printer "):
            parts = line.split()
            if len(parts) >= 2:
                queues.append(parts[1])
        elif line.startswith("system default destination:"):
            default_queue = line.split(":", 1)[1].strip() or None

    return queues, default_queue


def parse_lpoptions_values(output: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for token in shlex.split(output):
        if "=" not in token:
            continue
        key, value = token.split("=", 1)
        values[key] = value
    return values


def parse_lpoptions_choices(
    output: str,
) -> dict[str, dict[str, str | list[str] | None]]:
    parsed: dict[str, dict[str, str | list[str] | None]] = {}

    for raw_line in output.splitlines():
        line = raw_line.strip()
        if not line or ":" not in line:
            continue

        name_part, values_part = line.split(":", 1)
        option_name, _, display_name = name_part.partition("/")

        choices: list[str] = []
        default_choice: str | None = None
        for token in values_part.strip().split():
            choice = token.lstrip("*")
            choices.append(choice)
            if token.startswith("*"):
                default_choice = choice

        parsed[option_name] = {
            "display_name": display_name or option_name,
            "default": default_choice,
            "choices": choices,
        }

    return parsed


def config_defaults(queue_name: str | None = None) -> PrinterConfig:
    return PrinterConfig(
        queue_name=queue_name or DEFAULT_QUEUE_NAME,
        page_size=DEFAULT_PAGE_SIZE,
        media=DEFAULT_MEDIA,
        br_cut_label=DEFAULT_BR_CUT_LABEL,
        br_cut_at_end=DEFAULT_BR_CUT_AT_END,
    )


def get_available_queues() -> tuple[list[str], str | None]:
    proc = run_command(["lpstat", "-p", "-d"])
    if proc.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list printers: {proc.stderr.strip() or proc.stdout.strip()}",
        )

    return parse_lpstat_destinations(proc.stdout)


def get_default_queue_name() -> str:
    queues, default_queue = get_available_queues()
    if default_queue:
        return default_queue
    if queues:
        return queues[0]
    return DEFAULT_QUEUE_NAME


def load_saved_config() -> PrinterConfig | None:
    if not CONFIG_PATH.exists():
        return None

    data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    return PrinterConfig.model_validate(data)


def resolve_saved_config() -> PrinterConfig:
    saved = load_saved_config()
    if saved is not None:
        return saved

    return config_defaults(get_default_queue_name())


def save_config(config: PrinterConfig) -> None:
    CONFIG_PATH.write_text(
        json.dumps(config.model_dump(), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def get_queue_values(queue_name: str) -> dict[str, str]:
    proc = run_command(["lpoptions", "-p", queue_name])
    if proc.returncode != 0:
        raise HTTPException(
            status_code=404,
            detail=f"Failed to read printer options for {queue_name}: {proc.stderr.strip() or proc.stdout.strip()}",
        )

    return parse_lpoptions_values(proc.stdout)


def get_queue_choices(queue_name: str) -> dict[str, dict[str, str | list[str] | None]]:
    proc = run_command(["lpoptions", "-p", queue_name, "-l"])
    if proc.returncode != 0:
        raise HTTPException(
            status_code=404,
            detail=f"Failed to read advertised printer options for {queue_name}: {proc.stderr.strip() or proc.stdout.strip()}",
        )

    return parse_lpoptions_choices(proc.stdout)


def build_live_config(
    queue_name: str,
    values: dict[str, str],
    choices: dict[str, dict[str, str | list[str] | None]],
) -> PrinterConfig:
    page_size = values.get("PageSize")
    media = values.get("media")
    cut_label = values.get("BrCutLabel")
    cut_at_end = values.get("BrCutAtEnd")

    if page_size is None and "PageSize" in choices:
        page_size = choices["PageSize"]["default"]  # type: ignore[assignment]
    if media is None and "media" in choices:
        media = choices["media"]["default"]  # type: ignore[assignment]
    if cut_label is None and "BrCutLabel" in choices:
        cut_label = choices["BrCutLabel"]["default"]  # type: ignore[assignment]
    if cut_at_end is None and "BrCutAtEnd" in choices:
        cut_at_end = choices["BrCutAtEnd"]["default"]  # type: ignore[assignment]

    if media is None:
        media = page_size or DEFAULT_MEDIA
    if page_size is None:
        page_size = media or DEFAULT_PAGE_SIZE

    return PrinterConfig(
        queue_name=queue_name,
        page_size=page_size or DEFAULT_PAGE_SIZE,
        media=media or DEFAULT_MEDIA,
        br_cut_label=cut_label or DEFAULT_BR_CUT_LABEL,
        br_cut_at_end=cut_at_end or DEFAULT_BR_CUT_AT_END,
    )


def get_live_config(
    queue_name: str,
) -> tuple[PrinterConfig, dict[str, dict[str, str | list[str] | None]]]:
    values = get_queue_values(queue_name)
    choices = get_queue_choices(queue_name)
    live_config = build_live_config(queue_name, values, choices)
    return live_config, choices


def serialize_option_choices(
    choices: dict[str, dict[str, str | list[str] | None]],
) -> dict[str, dict[str, str | list[str] | None]]:
    serialized: dict[str, dict[str, str | list[str] | None]] = {}
    for key in ("PageSize", "media", "BrCutLabel", "BrCutAtEnd"):
        if key in choices:
            serialized[key] = choices[key]
    return serialized


def config_response(selected_queue: str | None = None) -> dict:
    queues, default_queue = get_available_queues()
    saved_config = resolve_saved_config()
    queue_name = (
        selected_queue or saved_config.queue_name or default_queue or DEFAULT_QUEUE_NAME
    )
    live_config, option_choices = get_live_config(queue_name)

    return {
        "saved_config": saved_config.model_dump(),
        "live_config": live_config.model_dump(),
        "queues": queues,
        "default_queue": default_queue,
        "option_choices": serialize_option_choices(option_choices),
    }


def apply_printer_config(config: PrinterConfig) -> subprocess.CompletedProcess[str]:
    cmd = [
        "sudo",
        "/usr/sbin/lpadmin",
        "-p",
        config.queue_name,
        "-o",
        f"PageSize={config.page_size}",
        "-o",
        f"media={config.media}",
        "-o",
        f"BrCutLabel={config.br_cut_label}",
        "-o",
        f"BrCutAtEnd={config.br_cut_at_end}",
    ]
    return run_command(cmd)


def render_label_html(data: LabelRequest) -> str:
    template = templates.get_template("labels/label.html")
    page_dimensions = label_dimensions_mm(resolve_saved_config().page_size)
    return template.render(
        title=data.title,
        subtitle=data.subtitle,
        body=data.body,
        **page_dimensions,
    )


def html_to_pdf_bytes(html: str) -> bytes:
    from weasyprint import HTML

    return HTML(string=html).write_pdf()


@app.post("/labels.pdf", response_class=Response)
def generate_label_pdf(data: LabelRequest) -> Response:
    html = render_label_html(data)
    pdf_bytes = html_to_pdf_bytes(html)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'inline; filename="label.pdf"',
        },
    )


@app.get("/")
def index() -> HTMLResponse:
    template = templates.get_template("index.html")
    return HTMLResponse(content=template.render(), status_code=200)


@app.get("/config")
def config_page() -> HTMLResponse:
    template = templates.get_template("config.html")
    return HTMLResponse(content=template.render(), status_code=200)


@app.get("/api/config")
def get_config(queue_name: str | None = Query(default=None)) -> dict:
    return config_response(queue_name)


@app.post("/api/config")
def save_printer_config(config: PrinterConfig) -> dict:
    save_config(config)
    response = config_response(config.queue_name)
    response["saved_config"] = config.model_dump()
    return response


@app.post("/api/config/sync")
def sync_printer_config(request: SyncRequest) -> dict:
    live_config, option_choices = get_live_config(request.queue_name)
    save_config(live_config)

    queues, default_queue = get_available_queues()
    return {
        "saved_config": live_config.model_dump(),
        "live_config": live_config.model_dump(),
        "queues": queues,
        "default_queue": default_queue,
        "option_choices": serialize_option_choices(option_choices),
    }


@app.post("/api/config/apply")
def apply_config(config: PrinterConfig) -> dict:
    save_config(config)
    proc = apply_printer_config(config)
    if proc.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to apply printer settings: {proc.stderr.strip() or proc.stdout.strip()}",
        )

    response = config_response(config.queue_name)
    response["saved_config"] = config.model_dump()
    return response


@app.post("/print")
def print_label(data: LabelRequest) -> dict:
    config = resolve_saved_config()
    html = render_label_html(data)
    pdf_bytes = html_to_pdf_bytes(html)

    with NamedTemporaryFile(suffix=".pdf", delete=True) as tmp:
        tmp.write(pdf_bytes)
        tmp.flush()

        cmd = [
            "lp",
            "-d",
            config.queue_name,
            "-n",
            str(data.copies),
            tmp.name,
        ]
        proc = run_command(cmd)

    if proc.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"Print failed: {proc.stderr.strip()}",
        )

    return {"ok": True, "queue": config.queue_name, "stdout": proc.stdout.strip()}
