from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from .models import LabelProfileInput

PACKAGE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = PACKAGE_DIR / "templates"
LABEL_MARGIN_MM = 2.0

templates = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


def mm_to_css(value: float) -> str:
    return f"{value:g}"


def label_dimensions_mm(width_mm: float, height_mm: float) -> dict[str, str]:
    label_width = max(width_mm - (LABEL_MARGIN_MM * 2), 1.0)
    label_height = max(height_mm - (LABEL_MARGIN_MM * 2), 1.0)
    return {
        "page_width_mm": mm_to_css(width_mm),
        "page_height_mm": mm_to_css(height_mm),
        "label_width_mm": mm_to_css(label_width),
        "label_height_mm": mm_to_css(label_height),
        "margin_mm": mm_to_css(LABEL_MARGIN_MM),
    }


def render_label_html(profile: LabelProfileInput) -> str:
    template = templates.get_template("labels/label.html")
    page_dimensions = label_dimensions_mm(profile.width_mm, profile.height_mm)
    border = profile.border
    border_inset = border.inset_mm if border.enabled else 0.0
    border_thickness = border.thickness_mm if border.enabled else 0.0
    content_inset = border_inset + border_thickness + 0.75 if border.enabled else 0.0
    return template.render(
        rows=profile.rows,
        border=border,
        border_inset_mm=mm_to_css(border_inset),
        border_thickness_mm=mm_to_css(border_thickness),
        border_radius_mm=mm_to_css(border.radius_mm if border.enabled else 0.0),
        content_inset_mm=mm_to_css(content_inset),
        **page_dimensions,
    )


def html_to_pdf_bytes(html: str) -> bytes:
    from weasyprint import HTML

    return HTML(string=html).write_pdf()
