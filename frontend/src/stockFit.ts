export type ProfileOrientation = "portrait" | "landscape";

export type ActiveStock = {
	stock_width_mm: number;
	stock_is_continuous: boolean;
	stock_length_mm: number | null;
};

type OrientationProfile = {
	width_mm: number;
	height_mm: number;
	orientation: ProfileOrientation;
};

export type FitMode = "fits_selected" | "fits_auto_switched" | "cannot_fit";

export type StockFit = {
	fit_mode: FitMode;
	fits_loaded_stock: boolean;
	selected_orientation: ProfileOrientation;
	applied_orientation: ProfileOrientation;
	auto_switched_orientation: boolean;
	message: string | null;
	message_level: "info" | "warning" | null;
};

export const MATCH_TOLERANCE_MM = 0.1;

export function alternateOrientation(
	orientation: ProfileOrientation,
): ProfileOrientation {
	return orientation === "landscape" ? "portrait" : "landscape";
}

export function dimensionsForOrientation(
	profile: OrientationProfile,
	orientation: ProfileOrientation,
): { width_mm: number; height_mm: number } {
	return orientation === "landscape"
		? {
				width_mm: profile.height_mm,
				height_mm: profile.width_mm,
			}
		: {
				width_mm: profile.width_mm,
				height_mm: profile.height_mm,
			};
}

export function effectiveDimensions(profile: OrientationProfile): {
	width_mm: number;
	height_mm: number;
} {
	return dimensionsForOrientation(profile, profile.orientation);
}

function matchesDimension(left: number, right: number): boolean {
	return Math.abs(left - right) <= MATCH_TOLERANCE_MM;
}

function chooseBestContinuousOrientation(
	profile: OrientationProfile,
	stockWidthMm: number,
): {
	applied_orientation: ProfileOrientation | null;
	applied_width_mm: number;
	auto_switched_orientation: boolean;
} {
	const selectedOrientation = profile.orientation;
	const candidates: Array<{
		gap_mm: number;
		preference: number;
		orientation: ProfileOrientation;
		width_mm: number;
	}> = [];

	for (const orientation of [
		selectedOrientation,
		alternateOrientation(selectedOrientation),
	]) {
		const dimensions = dimensionsForOrientation(profile, orientation);
		if (dimensions.width_mm <= stockWidthMm + MATCH_TOLERANCE_MM) {
			candidates.push({
				gap_mm: Math.abs(stockWidthMm - dimensions.width_mm),
				preference: orientation === selectedOrientation ? 0 : 1,
				orientation,
				width_mm: dimensions.width_mm,
			});
		}
	}

	if (!candidates.length) {
		const selectedDimensions = effectiveDimensions(profile);
		return {
			applied_orientation: null,
			applied_width_mm: selectedDimensions.width_mm,
			auto_switched_orientation: false,
		};
	}

	const best = candidates.reduce((currentBest, candidate) => {
		if (candidate.gap_mm < currentBest.gap_mm) {
			return candidate;
		}
		if (
			candidate.gap_mm === currentBest.gap_mm &&
			candidate.preference < currentBest.preference
		) {
			return candidate;
		}
		return currentBest;
	});

	return {
		applied_orientation: best.orientation,
		applied_width_mm: best.width_mm,
		auto_switched_orientation: best.orientation !== selectedOrientation,
	};
}

function describeStock(stock: ActiveStock): string {
	return stock.stock_is_continuous
		? `continuous ${stock.stock_width_mm}mm roll`
		: `${stock.stock_width_mm}x${stock.stock_length_mm ?? 0}mm fixed label`;
}

export function evaluateStockFit(
	profile: OrientationProfile,
	stock: ActiveStock,
): StockFit {
	const selectedOrientation = profile.orientation;
	const selectedDimensions = effectiveDimensions(profile);

	if (stock.stock_is_continuous) {
		const continuousChoice = chooseBestContinuousOrientation(
			profile,
			stock.stock_width_mm,
		);
		if (continuousChoice.applied_orientation == null) {
			return {
				fit_mode: "cannot_fit",
				fits_loaded_stock: false,
				selected_orientation: selectedOrientation,
				applied_orientation: selectedOrientation,
				auto_switched_orientation: false,
				message:
					`The ${selectedOrientation} layout is ${selectedDimensions.width_mm} mm wide, ` +
					`but the loaded ${describeStock(stock)} is only ${stock.stock_width_mm} mm wide.`,
				message_level: "warning",
			};
		}

		if (!continuousChoice.auto_switched_orientation) {
			return {
				fit_mode: "fits_selected",
				fits_loaded_stock: true,
				selected_orientation: selectedOrientation,
				applied_orientation: selectedOrientation,
				auto_switched_orientation: false,
				message: null,
				message_level: null,
			};
		}

		return {
			fit_mode: "fits_auto_switched",
			fits_loaded_stock: true,
			selected_orientation: selectedOrientation,
			applied_orientation: continuousChoice.applied_orientation,
			auto_switched_orientation: true,
			message: matchesDimension(
				continuousChoice.applied_width_mm,
				stock.stock_width_mm,
			)
				? `This ${selectedOrientation} design matches the loaded ` +
					`${describeStock(stock)} when printed as ${continuousChoice.applied_orientation}. ` +
					`Print output will switch to ${continuousChoice.applied_orientation} automatically.`
				: `This ${selectedOrientation} design fits the loaded ` +
					`${describeStock(stock)} better when printed as ${continuousChoice.applied_orientation}. ` +
					`Print output will switch to ${continuousChoice.applied_orientation} automatically.`,
			message_level: "info",
		};
	}

	const fixedLength = Number(stock.stock_length_mm ?? 0);
	const fitsLoadedStock =
		matchesDimension(selectedDimensions.width_mm, stock.stock_width_mm) &&
		matchesDimension(selectedDimensions.height_mm, fixedLength);

	return fitsLoadedStock
		? {
				fit_mode: "fits_selected",
				fits_loaded_stock: true,
				selected_orientation: selectedOrientation,
				applied_orientation: selectedOrientation,
				auto_switched_orientation: false,
				message: null,
				message_level: null,
			}
		: {
				fit_mode: "cannot_fit",
				fits_loaded_stock: false,
				selected_orientation: selectedOrientation,
				applied_orientation: selectedOrientation,
				auto_switched_orientation: false,
				message:
					`The ${selectedOrientation} layout does not match the loaded ` +
					`${describeStock(stock)} and may misprint.`,
				message_level: "warning",
			};
}
