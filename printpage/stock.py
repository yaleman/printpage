from dataclasses import dataclass
from typing import Literal

from .models import LabelProfileInput

MATCH_TOLERANCE_MM = 0.1
CONTINUOUS_PRINT_WIDTH_TRIM_MM = 1.0
FitMode = Literal["fits_selected", "fits_auto_switched", "cannot_fit"]
MessageLevel = Literal["info", "warning"] | None


@dataclass(frozen=True)
class StockCompatibility:
    fit_mode: FitMode
    fits_loaded_stock: bool
    selected_orientation: str
    applied_orientation: str
    auto_switched_orientation: bool
    message: str | None
    message_level: MessageLevel


@dataclass(frozen=True)
class ResolvedPrintLayout:
    page_width_mm: float
    page_height_mm: float
    content_width_mm: float
    content_height_mm: float
    media_width_mm: float
    is_continuous_roll_media: bool
    fit_mode: FitMode
    selected_orientation: str
    applied_orientation: str
    auto_switched_orientation: bool
    message: str | None
    message_level: MessageLevel


def alternate_orientation(orientation: str) -> str:
    return "portrait" if orientation == "landscape" else "landscape"


def dimensions_for_orientation(
    profile: LabelProfileInput, orientation: str
) -> tuple[float, float]:
    if orientation == "landscape":
        return profile.height_mm, profile.width_mm
    return profile.width_mm, profile.height_mm


def oriented_dimensions(profile: LabelProfileInput) -> tuple[float, float]:
    return dimensions_for_orientation(profile, profile.orientation)


def resolve_preview_layout(profile: LabelProfileInput) -> ResolvedPrintLayout:
    content_width_mm, content_height_mm = oriented_dimensions(profile)
    return ResolvedPrintLayout(
        page_width_mm=content_width_mm,
        page_height_mm=content_height_mm,
        content_width_mm=content_width_mm,
        content_height_mm=content_height_mm,
        media_width_mm=content_width_mm,
        is_continuous_roll_media=False,
        fit_mode="fits_selected",
        selected_orientation=profile.orientation,
        applied_orientation=profile.orientation,
        auto_switched_orientation=False,
        message=None,
        message_level=None,
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
    selected_orientation = profile.orientation
    selected_width_mm, selected_height_mm = oriented_dimensions(profile)
    stock_description = describe_stock(stock_width_mm, stock_is_continuous, stock_length_mm)

    if stock_is_continuous:
        if selected_width_mm <= stock_width_mm + MATCH_TOLERANCE_MM:
            return StockCompatibility(
                fit_mode="fits_selected",
                fits_loaded_stock=True,
                selected_orientation=selected_orientation,
                applied_orientation=selected_orientation,
                auto_switched_orientation=False,
                message=None,
                message_level=None,
            )

        applied_orientation = alternate_orientation(selected_orientation)
        applied_width_mm, _ = dimensions_for_orientation(profile, applied_orientation)
        if applied_width_mm <= stock_width_mm + MATCH_TOLERANCE_MM:
            return StockCompatibility(
                fit_mode="fits_auto_switched",
                fits_loaded_stock=True,
                selected_orientation=selected_orientation,
                applied_orientation=applied_orientation,
                auto_switched_orientation=True,
                message=(
                    f"This {selected_orientation} design will fit on the loaded "
                    f"{stock_description} if printed as {applied_orientation}. "
                    f"Print will switch to {applied_orientation} automatically."
                ),
                message_level="info",
            )

        return StockCompatibility(
            fit_mode="cannot_fit",
            fits_loaded_stock=False,
            selected_orientation=selected_orientation,
            applied_orientation=selected_orientation,
            auto_switched_orientation=False,
            message=(
                f"The {selected_orientation} layout is {selected_width_mm:g}mm wide, but the loaded "
                f"{stock_description} is only {stock_width_mm:g}mm wide."
            ),
            message_level="warning",
        )

    fixed_length_mm = stock_length_mm or 0.0
    fits_loaded_stock = matches_dimension(
        selected_width_mm, stock_width_mm
    ) and matches_dimension(selected_height_mm, fixed_length_mm)
    if fits_loaded_stock:
        return StockCompatibility(
            fit_mode="fits_selected",
            fits_loaded_stock=True,
            selected_orientation=selected_orientation,
            applied_orientation=selected_orientation,
            auto_switched_orientation=False,
            message=None,
            message_level=None,
        )

    return StockCompatibility(
        fit_mode="cannot_fit",
        fits_loaded_stock=False,
        selected_orientation=selected_orientation,
        applied_orientation=selected_orientation,
        auto_switched_orientation=False,
        message=(
            f"The {selected_orientation} layout does not match the loaded "
            f"{stock_description} and may misprint."
        ),
        message_level="warning",
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
    content_width_mm, content_height_mm = dimensions_for_orientation(
        profile, compatibility.applied_orientation
    )

    if stock_is_continuous:
        printed_width_mm = stock_width_mm
        rendered_content_width_mm = content_width_mm
        if matches_dimension(content_width_mm, stock_width_mm):
            printed_width_mm = max(stock_width_mm - CONTINUOUS_PRINT_WIDTH_TRIM_MM, 1.0)
            rendered_content_width_mm = max(
                content_width_mm - CONTINUOUS_PRINT_WIDTH_TRIM_MM, 1.0
            )
        page_width_mm = printed_width_mm
        page_height_mm = content_height_mm
    else:
        page_width_mm = stock_width_mm
        page_height_mm = stock_length_mm or content_height_mm
        rendered_content_width_mm = content_width_mm

    return ResolvedPrintLayout(
        page_width_mm=page_width_mm,
        page_height_mm=page_height_mm,
        content_width_mm=rendered_content_width_mm,
        content_height_mm=content_height_mm,
        media_width_mm=stock_width_mm if stock_is_continuous else page_width_mm,
        is_continuous_roll_media=stock_is_continuous,
        fit_mode=compatibility.fit_mode,
        selected_orientation=compatibility.selected_orientation,
        applied_orientation=compatibility.applied_orientation,
        auto_switched_orientation=compatibility.auto_switched_orientation,
        message=compatibility.message,
        message_level=compatibility.message_level,
    )
