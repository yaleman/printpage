import { buildQueueTroubleshootingNotes } from "./queueTroubleshooting";
import "./stockFit.test";

function assertEqual<T>(actual: T, expected: T, message: string): void {
	if (actual !== expected) {
		throw new Error(
			`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`,
		);
	}
}

function assertDeepEqual<T>(actual: T, expected: T, message: string): void {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(
			`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`,
		);
	}
}

const baseConfig = {
	default_queue: "QL700",
	queue_name: "QL700",
	queues: ["QL700"],
	stock_is_continuous: true,
	stock_length_mm: null,
	stock_width_mm: 62,
};

function testNoOrientationWarningWhenDefaultsDoNotConflict(): void {
	const notes = buildQueueTroubleshootingNotes(baseConfig, {
		media: "62X1",
	});

	assertDeepEqual(
		notes,
		[
			"No obvious saved-default conflict was found. The next suspects are Brother filter behavior for continuous media and feed margin settings.",
		],
		"Expected the fallback note when defaults do not conflict",
	);
	assertEqual(
		notes.some((note) => note.includes("orientation default")),
		false,
		"Expected no missing-orientation warning for app-submitted jobs",
	);
}

function testOrientationMismatchStillWarns(): void {
	const notes = buildQueueTroubleshootingNotes(baseConfig, {
		"orientation-requested": "4",
		media: "62X1",
	});

	assertEqual(
		notes.includes(
			"Saved default orientation is 4, not portrait (3). This can rotate jobs before the Brother driver sees them.",
		),
		true,
		"Expected an orientation mismatch warning",
	);
}

function testLandscapeFlagStillWarns(): void {
	const notes = buildQueueTroubleshootingNotes(baseConfig, {
		landscape: "true",
		media: "62X1",
	});

	assertEqual(
		notes.includes(
			"Saved queue defaults include the bare `landscape` flag. That can force rotation regardless of document size.",
		),
		true,
		"Expected a landscape flag warning",
	);
}

function testMediaMismatchStillWarns(): void {
	const notes = buildQueueTroubleshootingNotes(baseConfig, {
		media: "62x29",
	});

	assertEqual(
		notes.includes(
			"Saved default media is 62x29, but the loaded stock is a 62X1 continuous roll. The app overrides media per job, but mismatched queue defaults are still suspicious.",
		),
		true,
		"Expected a media mismatch warning",
	);
}

testNoOrientationWarningWhenDefaultsDoNotConflict();
testOrientationMismatchStillWarns();
testLandscapeFlagStillWarns();
testMediaMismatchStillWarns();
