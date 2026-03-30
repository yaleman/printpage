import { evaluateStockFit } from "./stockFit";

function assertEqual<T>(actual: T, expected: T, message: string): void {
	if (actual !== expected) {
		throw new Error(
			`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`,
		);
	}
}

const continuousStock = {
	stock_width_mm: 62,
	stock_is_continuous: true,
	stock_length_mm: null,
} as const;

function testSelectedOrientationFitsContinuousRoll(): void {
	const fit = evaluateStockFit(
		{
			width_mm: 40,
			height_mm: 75,
			orientation: "portrait",
		},
		continuousStock,
	);

	assertEqual(
		fit.fit_mode,
		"fits_selected",
		"Expected the selected orientation to fit the roll",
	);
	assertEqual(
		fit.auto_switched_orientation,
		false,
		"Expected no auto-switch when the selected orientation already fits",
	);
}

function testAlternateOrientationCanAutoSwitchContinuousRoll(): void {
	const fit = evaluateStockFit(
		{
			width_mm: 75,
			height_mm: 62,
			orientation: "portrait",
		},
		continuousStock,
	);

	assertEqual(
		fit.fit_mode,
		"fits_auto_switched",
		"Expected the alternate orientation to be used when it fits the roll",
	);
	assertEqual(
		fit.applied_orientation,
		"landscape",
		"Expected continuous-roll auto-fit to switch to landscape",
	);
	assertEqual(
		fit.message_level,
		"info",
		"Expected an informational notice when print-time auto-switching is possible",
	);
}

function testExactRollWidthMatchBeatsNarrowSelectedOrientation(): void {
	const fit = evaluateStockFit(
		{
			width_mm: 22,
			height_mm: 61.98,
			orientation: "portrait",
		},
		{
			stock_width_mm: 61.98,
			stock_is_continuous: true,
			stock_length_mm: null,
		},
	);

	assertEqual(
		fit.fit_mode,
		"fits_auto_switched",
		"Expected the exact-width orientation to be preferred over a narrower selected orientation",
	);
	assertEqual(
		fit.applied_orientation,
		"landscape",
		"Expected the full-width landscape orientation to be chosen",
	);
	assertEqual(
		Boolean(
			fit.message?.includes("matches the loaded continuous 61.98mm roll"),
		),
		true,
		"Expected the notice to explain that the full roll width will be used",
	);
}

function testContinuousRollCannotFitEitherOrientation(): void {
	const fit = evaluateStockFit(
		{
			width_mm: 80,
			height_mm: 75,
			orientation: "portrait",
		},
		continuousStock,
	);

	assertEqual(
		fit.fit_mode,
		"cannot_fit",
		"Expected a warning state when neither orientation fits the roll",
	);
	assertEqual(
		fit.message_level,
		"warning",
		"Expected a warning notice when the design cannot fit the roll",
	);
}

testSelectedOrientationFitsContinuousRoll();
testAlternateOrientationCanAutoSwitchContinuousRoll();
testExactRollWidthMatchBeatsNarrowSelectedOrientation();
testContinuousRollCannotFitEitherOrientation();
