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


def choose_best_continuous_orientation(
    profile: LabelProfileInput, stock_width_mm: float
) -> tuple[str | None, float, float, bool]:
    selected_orientation = profile.orientation
    candidates: list[tuple[float, int, str, float, float]] = []

    for orientation in (
        selected_orientation,
        alternate_orientation(selected_orientation),
    ):
        width_mm, height_mm = dimensions_for_orientation(profile, orientation)
        if width_mm <= stock_width_mm + MATCH_TOLERANCE_MM:
            # Prefer the closest width match. Break ties in favor of the selected orientation.
            preference = 0 if orientation == selected_orientation else 1
            candidates.append(
                (abs(stock_width_mm - width_mm), preference, orientation, width_mm, height_mm)
            )

    if not candidates:
        selected_width_mm, selected_height_mm = oriented_dimensions(profile)
        return None, selected_width_mm, selected_height_mm, False

    _, _, orientation, width_mm, height_mm = min(candidates)
    return (
        orientation,
        width_mm,
        height_mm,
        orientation != selected_orientation,
    )


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
        applied_orientation, applied_width_mm, _, auto_switched = (
            choose_best_continuous_orientation(profile, stock_width_mm)
        )
        if applied_orientation is None:
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

        if not auto_switched:
            return StockCompatibility(
                fit_mode="fits_selected",
                fits_loaded_stock=True,
                selected_orientation=selected_orientation,
                applied_orientation=selected_orientation,
                auto_switched_orientation=False,
                message=None,
                message_level=None,
            )

        match_message = (
            f"This {selected_orientation} design matches the loaded "
            f"{stock_description} when printed as {applied_orientation}. "
            f"Print output will switch to {applied_orientation} automatically."
            if matches_dimension(applied_width_mm, stock_width_mm)
            else (
                f"This {selected_orientation} design fits the loaded "
                f"{stock_description} better when printed as {applied_orientation}. "
                f"Print output will switch to {applied_orientation} automatically."
            )
        )
        return StockCompatibility(
            fit_mode="fits_auto_switched",
            fits_loaded_stock=True,
            selected_orientation=selected_orientation,
            applied_orientation=applied_orientation,
            auto_switched_orientation=True,
            message=match_message,
            message_level="info",
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
    content_width_mm, content_height_mm = oriented_dimensions(profile)

    if stock_is_continuous:
        page_width_mm = content_width_mm
        page_height_mm = content_height_mm
        rendered_content_width_mm = content_width_mm
        rendered_content_height_mm = content_height_mm
        uses_page_height_for_media_width = compatibility.auto_switched_orientation
        media_axis_value = content_height_mm if uses_page_height_for_media_width else content_width_mm
        rendered_media_axis = stock_width_mm

        if matches_dimension(media_axis_value, stock_width_mm):
            rendered_media_axis = max(
                stock_width_mm - CONTINUOUS_PRINT_WIDTH_TRIM_MM, 1.0
            )

        if uses_page_height_for_media_width:
            page_height_mm = rendered_media_axis
            rendered_content_height_mm = min(content_height_mm, rendered_media_axis)
        else:
            page_width_mm = rendered_media_axis
            rendered_content_width_mm = min(content_width_mm, rendered_media_axis)
    else:
        page_width_mm = stock_width_mm
        page_height_mm = stock_length_mm or content_height_mm
        rendered_content_width_mm = content_width_mm
        rendered_content_height_mm = content_height_mm

    return ResolvedPrintLayout(
        page_width_mm=page_width_mm,
        page_height_mm=page_height_mm,
        content_width_mm=rendered_content_width_mm,
        content_height_mm=rendered_content_height_mm,
        media_width_mm=stock_width_mm if stock_is_continuous else page_width_mm,
        is_continuous_roll_media=stock_is_continuous,
        fit_mode=compatibility.fit_mode,
        selected_orientation=compatibility.selected_orientation,
        applied_orientation=compatibility.applied_orientation,
        auto_switched_orientation=compatibility.auto_switched_orientation,
        message=compatibility.message,
        message_level=compatibility.message_level,
    )
