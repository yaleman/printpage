from dataclasses import dataclass

from .models import LabelProfileInput

MATCH_TOLERANCE_MM = 0.1


@dataclass(frozen=True)
class StockCompatibility:
    fits_without_rotation: bool
    fits_with_rotation: bool
    should_rotate: bool
    warning_message: str | None


@dataclass(frozen=True)
class ResolvedPrintLayout:
    page_width_mm: float
    page_height_mm: float
    content_width_mm: float
    content_height_mm: float
    is_continuous_roll_media: bool
    should_rotate: bool
    warning_message: str | None


def resolve_preview_layout(profile: LabelProfileInput) -> ResolvedPrintLayout:
    return ResolvedPrintLayout(
        page_width_mm=profile.width_mm,
        page_height_mm=profile.height_mm,
        content_width_mm=profile.width_mm,
        content_height_mm=profile.height_mm,
        is_continuous_roll_media=False,
        should_rotate=False,
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
    if stock_is_continuous:
        fits_without_rotation = matches_dimension(profile.width_mm, stock_width_mm)
        fits_with_rotation = matches_dimension(profile.height_mm, stock_width_mm)
        should_rotate = False
    else:
        fixed_length_mm = stock_length_mm or 0.0
        fits_without_rotation = matches_dimension(
            profile.width_mm, stock_width_mm
        ) and matches_dimension(profile.height_mm, fixed_length_mm)
        fits_with_rotation = matches_dimension(
            profile.width_mm, fixed_length_mm
        ) and matches_dimension(profile.height_mm, stock_width_mm)
        should_rotate = not fits_without_rotation and fits_with_rotation

    stock_description = describe_stock(stock_width_mm, stock_is_continuous, stock_length_mm)

    if stock_is_continuous and not fits_without_rotation:
        warning_message = (
            f"The profile width should match the loaded {stock_description}; "
            "continuous labels will not auto-rotate."
        )
    elif should_rotate:
        warning_message = f"The job will auto-rotate to fit the loaded {stock_description}."
    elif not fits_without_rotation and not fits_with_rotation:
        warning_message = (
            f"The profile dimensions do not match the loaded {stock_description} and may misprint."
        )
    else:
        warning_message = None

    return StockCompatibility(
        fits_without_rotation=fits_without_rotation,
        fits_with_rotation=fits_with_rotation,
        should_rotate=should_rotate,
        warning_message=warning_message,
    )


def resolve_print_layout(
    profile: LabelProfileInput,
    *,
    stock_width_mm: float,
    stock_is_continuous: bool,
    stock_length_mm: float | None,
) -> ResolvedPrintLayout:
    compatibility = resolve_stock_compatibility(
        profile,
        stock_width_mm=stock_width_mm,
        stock_is_continuous=stock_is_continuous,
        stock_length_mm=stock_length_mm,
    )

    if stock_is_continuous:
        page_width_mm = stock_width_mm
        page_height_mm = profile.height_mm
    else:
        page_width_mm = stock_width_mm
        page_height_mm = stock_length_mm or profile.height_mm

    return ResolvedPrintLayout(
        page_width_mm=page_width_mm,
        page_height_mm=page_height_mm,
        content_width_mm=profile.width_mm,
        content_height_mm=profile.height_mm,
        is_continuous_roll_media=stock_is_continuous,
        should_rotate=compatibility.should_rotate,
        warning_message=compatibility.warning_message,
    )
