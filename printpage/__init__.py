import sys
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles

from .models import (
    AppState,
    LabelProfileInput,
    PrintJobResult,
    QueueConfig,
    QueueState,
    QueueStatus,
)
from .printer import get_available_queues, get_queue_choices, read_queue_status
from .rendering import html_to_pdf_bytes, render_label_html, templates
from .stock import resolve_preview_layout, resolve_print_layout
from .state import (
    create_profile,
    delete_profile,
    resolve_state,
    save_state,
    select_profile,
    update_profile,
    update_queue,
)
from .printer import apply_profile_to_printer, submit_print_job

app = FastAPI()
STATIC_DIR = Path(__file__).resolve().parent / "static"
print("Serving static files from:", STATIC_DIR, file=sys.stderr)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def index() -> HTMLResponse:
    template = templates.get_template("index.html")
    return HTMLResponse(content=template.render(), status_code=200)


@app.get("/config", include_in_schema=False)
def config_page() -> HTMLResponse:
    template = templates.get_template("config.html")
    return HTMLResponse(content=template.render(), status_code=200)


@app.get("/api/state", response_model=AppState)
def get_state() -> AppState:
    return resolve_state()


@app.post("/api/profiles", response_model=AppState)
def create_profile_endpoint(profile: LabelProfileInput) -> AppState:
    return create_profile(profile)


@app.put("/api/profiles/{profile_id}", response_model=AppState)
def update_profile_endpoint(profile_id: str, profile: LabelProfileInput) -> AppState:
    try:
        return update_profile(profile_id, profile)
    except KeyError as error:
        raise HTTPException(
            status_code=404, detail=f"Unknown profile: {profile_id}"
        ) from error


@app.delete("/api/profiles/{profile_id}", response_model=AppState)
def delete_profile_endpoint(profile_id: str) -> AppState:
    try:
        return delete_profile(profile_id)
    except KeyError as error:
        raise HTTPException(
            status_code=404, detail=f"Unknown profile: {profile_id}"
        ) from error


@app.post("/api/profiles/{profile_id}/select", response_model=AppState)
def select_profile_endpoint(profile_id: str) -> AppState:
    try:
        return select_profile(profile_id)
    except KeyError as error:
        raise HTTPException(
            status_code=404, detail=f"Unknown profile: {profile_id}"
        ) from error


@app.get("/api/config", response_model=QueueState)
def get_config() -> QueueState:
    queues, default_queue = get_available_queues()
    state = resolve_state(default_queue)
    return QueueState(
        queue_name=state.queue_name,
        stock_width_mm=state.stock_width_mm,
        stock_is_continuous=state.stock_is_continuous,
        stock_length_mm=state.stock_length_mm,
        queues=queues,
        default_queue=default_queue,
    )


@app.post("/api/config", response_model=QueueState)
def save_config(queue_config: QueueConfig) -> QueueState:
    state = update_queue(queue_config)
    queues, default_queue = get_available_queues()
    return QueueState(
        queue_name=state.queue_name,
        stock_width_mm=state.stock_width_mm,
        stock_is_continuous=state.stock_is_continuous,
        stock_length_mm=state.stock_length_mm,
        queues=queues,
        default_queue=default_queue,
    )


@app.get("/api/config/options")
def get_config_options(queue_name: str | None = Query(default=None)) -> dict[str, dict[str, str | list[str] | None]]:
    state = resolve_state()
    return get_queue_choices(queue_name or state.queue_name)


@app.get("/api/queue-status", response_model=QueueStatus)
def get_queue_status(queue_name: str | None = Query(default=None)) -> QueueStatus:
    state = resolve_state()
    active_queue_name = queue_name or state.queue_name
    return read_queue_status(active_queue_name)


@app.post(
    "/labels.pdf",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}}},
)
def generate_label_pdf(profile: LabelProfileInput) -> Response:
    layout = resolve_preview_layout(profile)
    html = render_label_html(profile, layout)
    pdf_bytes = html_to_pdf_bytes(html)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="label.pdf"'},
    )


@app.post("/print", response_model=PrintJobResult)
def print_label(profile: LabelProfileInput) -> PrintJobResult:
    state = resolve_state()
    layout = resolve_print_layout(
        profile,
        stock_width_mm=state.stock_width_mm,
        stock_is_continuous=state.stock_is_continuous,
        stock_length_mm=state.stock_length_mm,
    )
    media_value, cut_value, quality_key = apply_profile_to_printer(
        state.queue_name, profile, layout
    )
    html = render_label_html(profile, layout)
    pdf_bytes = html_to_pdf_bytes(html)

    with NamedTemporaryFile(suffix=".pdf", delete=True) as tmp:
        tmp.write(pdf_bytes)
        tmp.flush()
        return PrintJobResult.model_validate(
            submit_print_job(
                state.queue_name,
                profile.quantity,
                tmp.name,
                media_value=media_value,
                cut_value=cut_value,
                quality_key=quality_key,
                quality_value=profile.quality,
            )
        )


__all__ = ["app", "html_to_pdf_bytes", "render_label_html", "save_state"]
