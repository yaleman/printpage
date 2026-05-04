from functools import lru_cache
import math
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from PIL import ImageFont

from .models import LabelProfileInput
from .stock import ResolvedPrintLayout

PACKAGE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = PACKAGE_DIR / "templates"
LABEL_MARGIN_MM = 0.0
DYNAMIC_ROW_MARGIN_MM = 1.0
ROW_GAP_MM = 1.0
POINTS_PER_MM = 72 / 25.4
MAX_DYNAMIC_FONT_PT = 240
ITALIC_SKEW_DEGREES = 12

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


def font_candidates(bold: bool, italic: bool) -> list[str]:
    if bold and italic:
        return [
            "DejaVuSans-BoldOblique.ttf",
            "LiberationSans-BoldItalic.ttf",
            "NotoSans-BoldItalic.ttf",
            "Arial Bold Italic.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf",
            "/usr/share/fonts/truetype/liberation2/LiberationSans-BoldItalic.ttf",
            "/usr/share/fonts/opentype/noto/NotoSans-BoldItalic.ttf",
            "/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf",
        ]
    if bold:
        return [
            "DejaVuSans-Bold.ttf",
            "LiberationSans-Bold.ttf",
            "NotoSans-Bold.ttf",
            "Arial Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
            "/usr/share/fonts/opentype/noto/NotoSans-Bold.ttf",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        ]
    if italic:
        return [
            "DejaVuSans-Oblique.ttf",
            "LiberationSans-Italic.ttf",
            "NotoSans-Italic.ttf",
            "Arial Italic.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
            "/usr/share/fonts/truetype/liberation2/LiberationSans-Italic.ttf",
            "/usr/share/fonts/opentype/noto/NotoSans-Italic.ttf",
            "/System/Library/Fonts/Supplemental/Arial Italic.ttf",
        ]
    return [
        "DejaVuSans.ttf",
        "LiberationSans-Regular.ttf",
        "NotoSans-Regular.ttf",
        "Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
        "/usr/share/fonts/opentype/noto/NotoSans-Regular.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]


@lru_cache(maxsize=256)
def load_label_font(size: int, bold: bool, italic: bool) -> Any:
    for candidate in font_candidates(bold, italic):
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue

    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def measured_text_width(text: str, size: int, bold: bool, italic: bool) -> int:
    font = load_label_font(size, bold, italic)
    left, _top, right, _bottom = font.getbbox(text)
    return max(right - left, 1)


def dynamic_text_width(text: str, size: int, bold: bool, italic: bool) -> float:
    width = float(measured_text_width(text, size, bold, italic))
    if italic:
        width += size * 1.1 * math.tan(math.radians(ITALIC_SKEW_DEGREES))
    return width


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
    target_width_pt = max(available_width_mm, 1.0) * POINTS_PER_MM
    max_height_pt = max(row_height_mm, 1.0) * POINTS_PER_MM / 1.1
    high = max(1, min(int(max_height_pt), MAX_DYNAMIC_FONT_PT))
    low = 1
    best = 1
    measured_text = normalize_dynamic_text(text)

    while low <= high:
        size = (low + high) // 2
        if dynamic_text_width(measured_text, size, bold, italic) <= target_width_pt:
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
        **page_dimensions,
    )


def html_to_pdf_bytes(html: str) -> bytes:
    from weasyprint import HTML

    return HTML(string=html).write_pdf()
