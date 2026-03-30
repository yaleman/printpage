from dataclasses import dataclass

from .models import LabelProfileInput

MATCH_TOLERANCE_MM = 0.1


@dataclass(frozen=True)
class StockCompatibility:
    fits_loaded_stock: bool
    warning_message: str | None


@dataclass(frozen=True)
class ResolvedPrintLayout:
    page_width_mm: float
    page_height_mm: float
    content_width_mm: float
    content_height_mm: float
    is_continuous_roll_media: bool
    warning_message: str | None


def oriented_dimensions(profile: LabelProfileInput) -> tuple[float, float]:
    if profile.orientation == "landscape":
        return profile.height_mm, profile.width_mm
    return profile.width_mm, profile.height_mm


def resolve_preview_layout(profile: LabelProfileInput) -> ResolvedPrintLayout:
    content_width_mm, content_height_mm = oriented_dimensions(profile)
    return ResolvedPrintLayout(
        page_width_mm=content_width_mm,
        page_height_mm=content_height_mm,
        content_width_mm=content_width_mm,
        content_height_mm=content_height_mm,
        is_continuous_roll_media=False,
        warning_message=None,
    )


def matches_dimension(left: float, right: float) -> bool:
    return abs(left - right) <= MATCH_TOLERANCE_MM


def describe_stock(stock_width_mm: float, stock_is_continuous: bool, stock_length_mm: float | None) -> str:
    if stock_is_continuous:
        return f"continuous {stock_width_mm:g}mm roll"
    return f"{stock_width_mm:g}x{stock_length_mm or 0:g}mm fixed label"


def resolve_stock_compatibility(
    profile: LabelProfileInput,
    *,
    stock_width_mm: float,
    stock_is_continuous: bool,
    stock_length_mm: float | None,
) -> StockCompatibility:
    content_width_mm, content_height_mm = oriented_dimensions(profile)
    orientation_label = profile.orientation

    if stock_is_continuous:
        fits_loaded_stock = content_width_mm <= stock_width_mm + MATCH_TOLERANCE_MM
    else:
        fixed_length_mm = stock_length_mm or 0.0
        fits_loaded_stock = matches_dimension(
            content_width_mm, stock_width_mm
        ) and matches_dimension(content_height_mm, fixed_length_mm)

    stock_description = describe_stock(stock_width_mm, stock_is_continuous, stock_length_mm)

    if stock_is_continuous and not fits_loaded_stock:
        warning_message = (
            f"The {orientation_label} layout is {content_width_mm:g}mm wide, but the loaded "
            f"{stock_description} is only {stock_width_mm:g}mm wide."
        )
    elif not fits_loaded_stock:
        warning_message = (
            f"The {orientation_label} layout does not match the loaded {stock_description} and may misprint."
        )
    else:
        warning_message = None

    return StockCompatibility(
        fits_loaded_stock=fits_loaded_stock,
        warning_message=warning_message,
    )


def resolve_print_layout(
    profile: LabelProfileInput,
    *,
    stock_width_mm: float,
    stock_is_continuous: bool,
    stock_length_mm: float | None,
) -> ResolvedPrintLayout:
    content_width_mm, content_height_mm = oriented_dimensions(profile)
    compatibility = resolve_stock_compatibility(
        profile,
        stock_width_mm=stock_width_mm,
        stock_is_continuous=stock_is_continuous,
        stock_length_mm=stock_length_mm,
    )

    if stock_is_continuous:
        page_width_mm = stock_width_mm
        page_height_mm = content_height_mm
    else:
        page_width_mm = stock_width_mm
        page_height_mm = stock_length_mm or content_height_mm

    return ResolvedPrintLayout(
        page_width_mm=page_width_mm,
        page_height_mm=page_height_mm,
        content_width_mm=content_width_mm,
        content_height_mm=content_height_mm,
        is_continuous_roll_media=stock_is_continuous,
        warning_message=compatibility.warning_message,
    )
