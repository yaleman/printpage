from tempfile import NamedTemporaryFile

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, Response

from .models import LabelProfileInput, QueueConfig
from .printer import get_available_queues
from .rendering import html_to_pdf_bytes, render_label_html, templates
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


@app.get("/")
def index() -> HTMLResponse:
    template = templates.get_template("index.html")
    return HTMLResponse(content=template.render(), status_code=200)


@app.get("/config")
def config_page() -> HTMLResponse:
    template = templates.get_template("config.html")
    return HTMLResponse(content=template.render(), status_code=200)


@app.get("/api/state")
def get_state() -> dict:
    return resolve_state().model_dump()


@app.post("/api/profiles")
def create_profile_endpoint(profile: LabelProfileInput) -> dict:
    return create_profile(profile).model_dump()


@app.put("/api/profiles/{profile_id}")
def update_profile_endpoint(profile_id: str, profile: LabelProfileInput) -> dict:
    try:
        return update_profile(profile_id, profile).model_dump()
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Unknown profile: {profile_id}") from error


@app.delete("/api/profiles/{profile_id}")
def delete_profile_endpoint(profile_id: str) -> dict:
    try:
        return delete_profile(profile_id).model_dump()
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Unknown profile: {profile_id}") from error


@app.post("/api/profiles/{profile_id}/select")
def select_profile_endpoint(profile_id: str) -> dict:
    try:
        return select_profile(profile_id).model_dump()
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Unknown profile: {profile_id}") from error


@app.get("/api/config")
def get_config() -> dict:
    queues, default_queue = get_available_queues()
    state = resolve_state(default_queue)
    return {
        "queue_name": state.queue_name,
        "queues": queues,
        "default_queue": default_queue,
    }


@app.post("/api/config")
def save_config(queue_config: QueueConfig) -> dict:
    state = update_queue(queue_config)
    queues, default_queue = get_available_queues()
    return {
        "queue_name": state.queue_name,
        "queues": queues,
        "default_queue": default_queue,
    }


@app.post("/labels.pdf", response_class=Response)
def generate_label_pdf(profile: LabelProfileInput) -> Response:
    html = render_label_html(profile)
    pdf_bytes = html_to_pdf_bytes(html)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="label.pdf"'},
    )


@app.post("/print")
def print_label(profile: LabelProfileInput) -> dict[str, str | bool]:
    state = resolve_state()
    apply_profile_to_printer(state.queue_name, profile)
    html = render_label_html(profile)
    pdf_bytes = html_to_pdf_bytes(html)

    with NamedTemporaryFile(suffix=".pdf", delete=True) as tmp:
        tmp.write(pdf_bytes)
        tmp.flush()
        return submit_print_job(state.queue_name, profile.quantity, tmp.name)


__all__ = ["app", "html_to_pdf_bytes", "render_label_html", "save_state"]
