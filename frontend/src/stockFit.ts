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
		if (
			selectedDimensions.width_mm <=
			stock.stock_width_mm + MATCH_TOLERANCE_MM
		) {
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

		const appliedOrientation = alternateOrientation(selectedOrientation);
		const appliedDimensions = dimensionsForOrientation(
			profile,
			appliedOrientation,
		);
		if (
			appliedDimensions.width_mm <=
			stock.stock_width_mm + MATCH_TOLERANCE_MM
		) {
			return {
				fit_mode: "fits_auto_switched",
				fits_loaded_stock: true,
				selected_orientation: selectedOrientation,
				applied_orientation: appliedOrientation,
				auto_switched_orientation: true,
				message:
					`This ${selectedOrientation} design will fit on the loaded ` +
					`${describeStock(stock)} if printed as ${appliedOrientation}. ` +
					`Print will switch to ${appliedOrientation} automatically.`,
				message_level: "info",
			};
		}

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
