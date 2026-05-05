from dataclasses import dataclass
from functools import lru_cache
from html import escape
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from .models import LabelProfileInput
from .stock import ResolvedPrintLayout

PACKAGE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = PACKAGE_DIR / "templates"
LABEL_FONT_FAMILY = '"DejaVu Sans", "Liberation Sans", "Noto Sans", Arial, sans-serif'
LABEL_MARGIN_MM = 0.0
DYNAMIC_ROW_MARGIN_MM = 1.0
ROW_GAP_MM = 1.0
POINTS_PER_MM = 72 / 25.4
CSS_PIXELS_PER_MM = 96 / 25.4
MAX_DYNAMIC_FONT_PT = 240

templates = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


def mm_to_css(value: float) -> str:
    return f"{value:g}"


def pt_to_css(value: float) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".")


def label_dimensions_mm(layout: ResolvedPrintLayout) -> dict[str, str]:
    page_width = max(layout.page_width_mm - (LABEL_MARGIN_MM * 2), 1.0)
    page_height = max(layout.page_height_mm - (LABEL_MARGIN_MM * 2), 1.0)
    content_width = max(layout.content_width_mm, 1.0)
    content_height = max(layout.content_height_mm, 1.0)
    return {
        "page_width_mm": mm_to_css(page_width),
        "page_height_mm": mm_to_css(page_height),
        "content_width_mm": mm_to_css(content_width),
        "content_height_mm": mm_to_css(content_height),
        "margin_mm": mm_to_css(LABEL_MARGIN_MM),
    }


@dataclass(frozen=True)
class TextMetrics:
    width_px: float
    height_px: float
    font_style: str
    font_weight: int | str


@lru_cache(maxsize=2048)
def measure_weasyprint_text(
    text: str,
    size_pt: int,
    bold: bool,
    italic: bool,
) -> TextMetrics:
    from weasyprint import HTML

    font_weight = 700 if bold else 400
    font_style = "italic" if italic else "normal"
    html = f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      @page {{ size: 1000mm 100mm; margin: 0; }}
      html, body {{ margin: 0; padding: 0; }}
      .measure {{
        font-family: {LABEL_FONT_FAMILY};
        font-size: {size_pt}pt;
        font-weight: {font_weight};
        font-style: {font_style};
        line-height: 1.1;
        white-space: nowrap;
      }}
    </style>
  </head>
  <body><div class="measure">{escape(text)}</div></body>
</html>"""
    document = HTML(string=html).render()
    text_width = 0.0
    line_height = 0.0
    rendered_style = font_style
    rendered_weight: int | str = font_weight

    def collect_metrics(box: object) -> None:
        nonlocal text_width, line_height, rendered_style, rendered_weight
        # Isolate WeasyPrint's internal box-tree access here so fitting and
        # final PDF rendering still use one layout engine.
        box_type = type(box).__name__
        if box_type == "LineBox":
            line_height = max(line_height, float(getattr(box, "height", 0.0)))
        if box_type == "TextBox":
            text_width = max(text_width, float(getattr(box, "width", 0.0)))
            style = getattr(box, "style", {})
            rendered_style = style.get("font_style", rendered_style)
            rendered_weight = style.get("font_weight", rendered_weight)
        for child in getattr(box, "children", []):
            collect_metrics(child)

    collect_metrics(document.pages[0]._page_box)
    if line_height <= 0:
        line_height = size_pt * CSS_PIXELS_PER_MM / POINTS_PER_MM * 1.1
    return TextMetrics(
        width_px=text_width,
        height_px=line_height,
        font_style=rendered_style,
        font_weight=rendered_weight,
    )


def normalize_dynamic_text(text: str) -> str:
    return " ".join(text.split()) or " "


def dynamic_font_size_pt(
    *,
    text: str,
    bold: bool,
    italic: bool,
    available_width_mm: float,
    row_height_mm: float,
) -> float:
    target_width_px = max(available_width_mm, 1.0) * CSS_PIXELS_PER_MM
    target_height_px = max(row_height_mm, 1.0) * CSS_PIXELS_PER_MM
    max_height_pt = max(row_height_mm, 1.0) * POINTS_PER_MM / 1.1
    high = max(1, min(int(max_height_pt), MAX_DYNAMIC_FONT_PT))
    low = 1
    best = 1
    measured_text = normalize_dynamic_text(text)

    while low <= high:
        size = (low + high) // 2
        metrics = measure_weasyprint_text(measured_text, size, bold, italic)
        if metrics.width_px <= target_width_px and metrics.height_px <= target_height_px:
            best = size
            low = size + 1
        else:
            high = size - 1

    return float(best)


def label_rows(
    profile: LabelProfileInput,
    layout: ResolvedPrintLayout,
    content_inset_mm: float,
) -> list[dict[str, Any]]:
    row_count = max(len(profile.rows), 1)
    available_width_mm = max(
        layout.content_width_mm - (content_inset_mm * 2) - (DYNAMIC_ROW_MARGIN_MM * 2),
        1.0,
    )
    available_height_mm = max(layout.content_height_mm - (content_inset_mm * 2), 1.0)
    row_height_mm = max(
        (available_height_mm - (ROW_GAP_MM * max(row_count - 1, 0))) / row_count,
        1.0,
    )

    rows: list[dict[str, Any]] = []
    for row in profile.rows:
        row_data = row.model_dump()
        if row.level == "dynamic":
            row_data["dynamic_font_size_pt"] = pt_to_css(
                dynamic_font_size_pt(
                    text=row.text,
                    bold=row.bold,
                    italic=row.italic,
                    available_width_mm=available_width_mm,
                    row_height_mm=row_height_mm,
                )
            )
        rows.append(row_data)
    return rows


def render_label_html(profile: LabelProfileInput, layout: ResolvedPrintLayout) -> str:
    template = templates.get_template("labels/label.html")
    page_dimensions = label_dimensions_mm(layout)
    border = profile.border
    border_inset = border.inset_mm if border.enabled else 0.0
    border_thickness = border.thickness_mm if border.enabled else 0.0
    content_inset = border_inset + border_thickness + 0.75 if border.enabled else 0.0
    return template.render(
        rows=label_rows(profile, layout, content_inset),
        border=border,
        border_inset_mm=mm_to_css(border_inset),
        border_thickness_mm=mm_to_css(border_thickness),
        border_radius_mm=mm_to_css(border.radius_mm if border.enabled else 0.0),
        content_inset_mm=mm_to_css(content_inset),
        font_family=LABEL_FONT_FAMILY,
        **page_dimensions,
    )


def html_to_pdf_bytes(html: str) -> bytes:
    from weasyprint import HTML

    return HTML(string=html).write_pdf()
