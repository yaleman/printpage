from pathlib import Path
from tempfile import NamedTemporaryFile
import subprocess

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

app = FastAPI()

templates = Environment(
    loader=FileSystemLoader("templates"),
    autoescape=select_autoescape(["html", "xml"]),
)

QUEUE_NAME = "Brother_QL700"


class LabelRequest(BaseModel):
    title: str = Field(..., max_length=100)
    subtitle: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, max_length=1000)
    copies: int = Field(default=1, ge=1, le=20)


def render_label_html(data: LabelRequest) -> str:
    template = templates.get_template("label.html")
    return template.render(
        title=data.title,
        subtitle=data.subtitle,
        body=data.body,
    )


def html_to_pdf_bytes(html: str) -> bytes:
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


@app.post("/print")
def print_label(data: LabelRequest) -> dict:
    html = render_label_html(data)
    pdf_bytes = html_to_pdf_bytes(html)

    with NamedTemporaryFile(suffix=".pdf", delete=True) as tmp:
        tmp.write(pdf_bytes)
        tmp.flush()

        cmd = [
            "lp",
            "-d",
            QUEUE_NAME,
            "-n",
            str(data.copies),
            tmp.name,
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)

    if proc.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"Print failed: {proc.stderr.strip()}",
        )

    return {"ok": True, "queue": QUEUE_NAME, "stdout": proc.stdout.strip()}
