import type {
	GetConfigDefaultsApiConfigDefaultsGetResponse,
	QueueState,
} from "../client/types.gen";

export function buildQueueTroubleshootingNotes(
	config: QueueState | null,
	defaults: GetConfigDefaultsApiConfigDefaultsGetResponse | null,
): string[] {
	if (!config || !defaults) {
		return [
			"Query a queue to inspect likely causes of rotation or scaling problems.",
		];
	}

	const notes: string[] = [];
	const orientationValue = defaults["orientation-requested"];
	const mediaValue = defaults.media ?? defaults.PageSize;
	const scalingValue = defaults.scaling;
	const fitToPageValue = defaults["fit-to-page"];
	const numberUpValue = defaults["number-up"];
	const marginValue = defaults.BrMargin;
	const expectedContinuousMedia = `${String(config.stock_width_mm).replace(/\.0$/, "")}X1`;

	if (orientationValue && orientationValue !== "3") {
		notes.push(
			`Saved default orientation is ${orientationValue}, not portrait (3). This can rotate jobs before the Brother driver sees them.`,
		);
	}
	if (defaults.landscape === "true") {
		notes.push(
			"Saved queue defaults include the bare `landscape` flag. That can force rotation regardless of document size.",
		);
	}
	if (fitToPageValue && fitToPageValue !== "false") {
		notes.push(
			`Saved default fit-to-page is ${fitToPageValue}. That can rescale labels unexpectedly.`,
		);
	}
	if (scalingValue && scalingValue !== "100") {
		notes.push(
			`Saved default scaling is ${scalingValue} instead of 100. That can shrink or enlarge labels.`,
		);
	}
	if (numberUpValue && numberUpValue !== "1") {
		notes.push(
			`Saved default number-up is ${numberUpValue} instead of 1. That can place labels on a reduced layout.`,
		);
	}
	if (
		config.stock_is_continuous &&
		mediaValue &&
		mediaValue.toUpperCase() !== expectedContinuousMedia.toUpperCase()
	) {
		notes.push(
			`Saved default media is ${mediaValue}, but the loaded stock is a ${expectedContinuousMedia} continuous roll. The app overrides media per job, but mismatched queue defaults are still suspicious.`,
		);
	}
	if (!config.stock_is_continuous && mediaValue) {
		const expectedFixedMedia = `${config.stock_width_mm}x${config.stock_length_mm}`;
		if (mediaValue.toLowerCase() !== expectedFixedMedia.toLowerCase()) {
			notes.push(
				`Saved default media is ${mediaValue}, not ${expectedFixedMedia}. The app overrides media per job, but mismatched queue defaults are still suspicious.`,
			);
		}
	}
	if (marginValue && Number(marginValue) > 3) {
		notes.push(
			`BrMargin is ${marginValue}. Higher feed margins can make short continuous labels come out longer than expected.`,
		);
	}
	if (!notes.length) {
		notes.push(
			"No obvious saved-default conflict was found. The next suspects are Brother filter behavior for continuous media and feed margin settings.",
		);
	}

	return notes;
}
