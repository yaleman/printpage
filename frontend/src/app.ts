import {
	createProfileEndpointApiProfilesPost,
	deleteProfileEndpointApiProfilesProfileIdDelete,
	generateLabelPdfLabelsPdfPost,
	getStateApiStateGet,
	printLabelPrintPost,
	selectProfileEndpointApiProfilesProfileIdSelectPost,
	updateProfileEndpointApiProfilesProfileIdPut,
} from "../client/sdk.gen";
import type {
	AppState,
	LabelBorderInput,
	LabelProfile,
	LabelProfileInput,
	LabelRowInput,
	PrintJobResult,
} from "../client/types.gen";
import { configureApiClient, getErrorMessage, isCanceledError } from "./api";

configureApiClient();

type RowDraft = {
	text: string;
	level: string;
	bold: boolean;
	italic: boolean;
	alignment: string;
};

type BorderDraft = {
	enabled: boolean;
	thickness_mm: number;
	inset_mm: number;
	radius_mm: number;
};

type ProfileDraft = {
	name: string;
	rows: RowDraft[];
	border: BorderDraft;
	width_mm: number;
	height_mm: number;
	is_continuous: boolean;
	cut_every: number;
	quality: string;
	quantity: number;
};

type EditableProfile = LabelProfile | ProfileDraft;

const DEFAULT_DRAFT: ProfileDraft = {
	name: "Default label",
	rows: [
		{
			text: "New label",
			level: "h2",
			bold: false,
			italic: false,
			alignment: "center",
		},
	],
	border: {
		enabled: false,
		thickness_mm: 0.5,
		inset_mm: 1,
		radius_mm: 1.5,
	},
	width_mm: 62,
	height_mm: 29,
	is_continuous: false,
	cut_every: 1,
	quality: "BrQuality",
	quantity: 1,
};

const PREVIEW_DEBOUNCE_MS = 250;

function requireElement<T extends HTMLElement>(id: string): T {
	const element = document.getElementById(id);
	if (!element) {
		throw new Error(`Missing required element: ${id}`);
	}

	return element as T;
}

const profilePicker = requireElement<HTMLSelectElement>("profile-picker");
const newProfileButton =
	requireElement<HTMLButtonElement>("new-profile-button");
const saveButton = requireElement<HTMLButtonElement>("save-button");
const deleteButton = requireElement<HTMLButtonElement>("delete-button");
const previewButton = requireElement<HTMLButtonElement>("preview-button");
const printButton = requireElement<HTMLButtonElement>("print-button");
const generalStatusEl = requireElement<HTMLElement>("general-status");
const previewStatusEl = requireElement<HTMLElement>("preview-status");
const previewHintEl = requireElement<HTMLElement>("preview-hint");
const previewFrame = requireElement<HTMLIFrameElement>("preview-frame");
const previewOverlay = requireElement<HTMLElement>("preview-overlay");
const previewOverlayText = requireElement<HTMLElement>("preview-overlay-text");
const previewMeta = requireElement<HTMLElement>("preview-meta");
const rowList = requireElement<HTMLElement>("row-list");
const addRowButton = requireElement<HTMLButtonElement>("add-row-button");
const deleteRowButton = requireElement<HTMLButtonElement>("delete-row-button");
const rowText = requireElement<HTMLTextAreaElement>("row-text");
const rowMeta = requireElement<HTMLElement>("row-meta");
const continuousToggle = requireElement<HTMLButtonElement>(
	"is-continuous-toggle",
);
const continuousInput = requireElement<HTMLInputElement>("is_continuous");
const borderToggle = requireElement<HTMLButtonElement>("border-enabled-toggle");
const borderInput = requireElement<HTMLInputElement>("border_enabled");
const borderFields = requireElement<HTMLElement>("border-fields");
const heightLabelText = requireElement<HTMLElement>("height-label-text");
const rowBoldButton = requireElement<HTMLButtonElement>("row-bold-button");
const rowItalicButton = requireElement<HTMLButtonElement>("row-italic-button");
const tabButtons = Array.from(
	document.querySelectorAll<HTMLButtonElement>("[data-tab-button]"),
);
const tabPanels = Array.from(
	document.querySelectorAll<HTMLElement>("[data-tab-panel]"),
);

let currentPdfBlobUrl: string | null = null;
let currentProfileId: string | null = null;
let currentTab = "profile";
let draftRows = structuredClone(DEFAULT_DRAFT.rows);
let activeRowIndex = 0;
let previewTimer: number | null = null;
let previewRequestToken = 0;
let previewController: AbortController | null = null;

function setStatus(message: string, isError = false): void {
	generalStatusEl.textContent = message;
	generalStatusEl.dataset.state = isError ? "error" : "idle";
}

function setPreviewStatus(message: string, isError = false): void {
	previewStatusEl.textContent = message;
	previewStatusEl.dataset.state = isError ? "error" : "idle";
}

function setPreviewOverlay(
	message: string,
	isError = false,
	visible = true,
): void {
	previewOverlayText.textContent = message;
	previewOverlay.dataset.state = isError ? "error" : "idle";
	previewOverlay.classList.toggle("hidden", !visible);
}

function updateTabState(): void {
	for (const button of tabButtons) {
		const isActive = button.dataset.tabButton === currentTab;
		button.dataset.state = isActive ? "on" : "off";
		button.setAttribute("aria-selected", String(isActive));
	}

	for (const panel of tabPanels) {
		const isActive = panel.dataset.tabPanel === currentTab;
		panel.classList.toggle("hidden", !isActive);
	}
}

function setToggleState(button: HTMLButtonElement, isActive: boolean): void {
	button.dataset.state = isActive ? "on" : "off";
	button.setAttribute("aria-pressed", String(isActive));
}

function updateContinuousLabel(): void {
	heightLabelText.textContent = continuousInput.checked
		? "Length (mm)"
		: "Height (mm)";
	setToggleState(continuousToggle, continuousInput.checked);
}

function updateBorderToggle(): void {
	setToggleState(borderToggle, borderInput.checked);
	borderFields.classList.toggle("opacity-50", !borderInput.checked);
}

function updatePreviewMeta(
	profile: Pick<ProfileDraft, "width_mm" | "height_mm" | "quantity">,
): void {
	const width = Number(profile.width_mm || 0);
	const height = Number(profile.height_mm || 0);
	const quantity = Number(profile.quantity || 0);
	previewMeta.textContent = `${width || 0} x ${height || 0} mm / Qty ${quantity || 0}`;
}

function normalizeBorder(border?: LabelBorderInput): BorderDraft {
	return {
		enabled: Boolean(border?.enabled),
		thickness_mm: border?.thickness_mm ?? DEFAULT_DRAFT.border.thickness_mm,
		inset_mm: border?.inset_mm ?? DEFAULT_DRAFT.border.inset_mm,
		radius_mm: border?.radius_mm ?? DEFAULT_DRAFT.border.radius_mm,
	};
}

function cloneRows(rows?: LabelRowInput[]): RowDraft[] {
	const sourceRows = rows?.length ? rows : DEFAULT_DRAFT.rows;
	return sourceRows.map((row) => ({
		text: row.text ?? "",
		level: row.level ?? "normal",
		alignment: row.alignment ?? "left",
		bold: Boolean(row.bold),
		italic: Boolean(row.italic),
	}));
}

function normalizeProfile(profile: EditableProfile): ProfileDraft {
	return {
		name: profile.name,
		rows: cloneRows(profile.rows),
		border: normalizeBorder(profile.border),
		width_mm: profile.width_mm,
		height_mm: profile.height_mm,
		is_continuous: Boolean(profile.is_continuous),
		cut_every: profile.cut_every ?? DEFAULT_DRAFT.cut_every,
		quality: profile.quality ?? DEFAULT_DRAFT.quality,
		quantity: profile.quantity ?? DEFAULT_DRAFT.quantity,
	};
}

function ensureActiveRow(): void {
	if (!draftRows.length) {
		draftRows = cloneRows(DEFAULT_DRAFT.rows);
	}

	if (activeRowIndex >= draftRows.length) {
		activeRowIndex = draftRows.length - 1;
	}

	if (activeRowIndex < 0) {
		activeRowIndex = 0;
	}
}

function rowSummary(row: RowDraft, index: number): string {
	const snippet = row.text.trim().replace(/\s+/g, " ");
	return snippet ? snippet.slice(0, 42) : `Row ${index + 1}`;
}

function syncActiveRowFromEditor(): void {
	ensureActiveRow();

	const row = draftRows[activeRowIndex];
	if (!row) {
		return;
	}

	row.text = rowText.value;
	row.level =
		document.querySelector<HTMLButtonElement>(
			"[data-row-level][data-state='on']",
		)?.dataset.rowLevel ?? "normal";
	row.alignment =
		document.querySelector<HTMLButtonElement>(
			"[data-row-alignment][data-state='on']",
		)?.dataset.rowAlignment ?? "left";
	row.bold = rowBoldButton.dataset.state === "on";
	row.italic = rowItalicButton.dataset.state === "on";
}

function renderRowList(): void {
	rowList.innerHTML = "";

	draftRows.forEach((row, index) => {
		const button = document.createElement("button");
		button.type = "button";
		button.dataset.active = index === activeRowIndex ? "true" : "false";
		button.className =
			"flex w-full flex-col rounded-lg border px-3 py-2 text-left transition " +
			"data-[active=true]:border-stone-900 data-[active=true]:bg-stone-900 " +
			"data-[active=true]:text-white data-[active=false]:border-stone-200 " +
			"data-[active=false]:bg-stone-50 data-[active=false]:text-stone-700 " +
			"data-[active=false]:hover:border-stone-400 data-[active=false]:hover:bg-white";
		button.innerHTML = `
      <span class="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">Row ${
				index + 1
			}</span>
      <span class="mt-1 line-clamp-2 text-sm font-medium">${rowSummary(row, index)}</span>
    `;
		button.addEventListener("click", () => {
			syncActiveRowFromEditor();
			activeRowIndex = index;
			renderRowsUI();
		});
		rowList.appendChild(button);
	});
}

function setSingleChoice(
	buttons: HTMLButtonElement[],
	activeValue: string,
	attributeName: "rowLevel" | "rowAlignment",
): void {
	for (const button of buttons) {
		const isActive = button.dataset[attributeName] === activeValue;
		button.dataset.state = isActive ? "on" : "off";
		button.setAttribute("aria-pressed", String(isActive));
	}
}

function renderRowsUI(): void {
	ensureActiveRow();
	renderRowList();

	const row = draftRows[activeRowIndex];
	rowText.value = row.text;
	setSingleChoice(
		Array.from(
			document.querySelectorAll<HTMLButtonElement>("[data-row-level]"),
		),
		row.level,
		"rowLevel",
	);
	setSingleChoice(
		Array.from(
			document.querySelectorAll<HTMLButtonElement>("[data-row-alignment]"),
		),
		row.alignment,
		"rowAlignment",
	);
	setToggleState(rowBoldButton, row.bold);
	setToggleState(rowItalicButton, row.italic);
	deleteRowButton.disabled = draftRows.length === 1;
	rowMeta.textContent = `${draftRows.length} row${draftRows.length === 1 ? "" : "s"} on label`;
}

function getRowsPayload(): LabelProfileInput["rows"] {
	syncActiveRowFromEditor();
	return draftRows.map((row) => ({
		text: row.text,
		level: row.level,
		alignment: row.alignment,
		bold: row.bold,
		italic: row.italic,
	}));
}

function getPayload(): LabelProfileInput {
	const payload: LabelProfileInput = {
		name: requireElement<HTMLInputElement>("name").value.trim(),
		rows: getRowsPayload(),
		border: {
			enabled: borderInput.checked,
			thickness_mm: Number(
				requireElement<HTMLInputElement>("border_thickness_mm").value,
			),
			inset_mm: Number(
				requireElement<HTMLInputElement>("border_inset_mm").value,
			),
			radius_mm: Number(
				requireElement<HTMLInputElement>("border_radius_mm").value,
			),
		},
		width_mm: Number(requireElement<HTMLInputElement>("width_mm").value),
		height_mm: Number(requireElement<HTMLInputElement>("height_mm").value),
		is_continuous: continuousInput.checked,
		cut_every: Number(requireElement<HTMLInputElement>("cut_every").value),
		quality: requireElement<HTMLSelectElement>("quality").value,
		quantity: Number(requireElement<HTMLInputElement>("quantity").value),
	};

	updatePreviewMeta(payload as ProfileDraft);
	return payload;
}

function fillForm(profile: EditableProfile): void {
	const normalizedProfile = normalizeProfile(profile);

	requireElement<HTMLInputElement>("name").value = normalizedProfile.name;
	requireElement<HTMLInputElement>("width_mm").value = String(
		normalizedProfile.width_mm,
	);
	requireElement<HTMLInputElement>("height_mm").value = String(
		normalizedProfile.height_mm,
	);
	requireElement<HTMLSelectElement>("quality").value =
		normalizedProfile.quality;
	requireElement<HTMLInputElement>("cut_every").value = String(
		normalizedProfile.cut_every,
	);
	requireElement<HTMLInputElement>("quantity").value = String(
		normalizedProfile.quantity,
	);

	const border = normalizedProfile.border;
	requireElement<HTMLInputElement>("border_thickness_mm").value = String(
		border.thickness_mm,
	);
	requireElement<HTMLInputElement>("border_inset_mm").value = String(
		border.inset_mm,
	);
	requireElement<HTMLInputElement>("border_radius_mm").value = String(
		border.radius_mm,
	);

	continuousInput.checked = normalizedProfile.is_continuous;
	borderInput.checked = border.enabled;
	updateContinuousLabel();
	updateBorderToggle();

	draftRows = normalizedProfile.rows;
	activeRowIndex = 0;
	renderRowsUI();
	updatePreviewMeta(normalizedProfile);
	deleteButton.disabled = !currentProfileId;
}

function renderProfilePicker(state: AppState): void {
	profilePicker.innerHTML = "";

	for (const profile of state.profiles ?? []) {
		const option = document.createElement("option");
		option.value = profile.id;
		option.textContent = profile.name;
		if (profile.id === state.selected_profile_id) {
			option.selected = true;
		}
		profilePicker.appendChild(option);
	}
}

function selectedProfileFromState(state: AppState): LabelProfile | undefined {
	const profiles = state.profiles ?? [];
	return (
		profiles.find((profile) => profile.id === state.selected_profile_id) ??
		profiles[0]
	);
}

function renderState(state: AppState): void {
	renderProfilePicker(state);

	const selectedProfile = selectedProfileFromState(state);
	currentProfileId = selectedProfile?.id ?? null;

	if (selectedProfile) {
		fillForm(selectedProfile);
	}
}

function startNewProfile(): void {
	currentProfileId = null;
	fillForm(DEFAULT_DRAFT);
	setStatus("Drafting a new profile.");
	void previewPdf({ immediate: true });
}

function cancelPreviewTimer(): void {
	if (previewTimer !== null) {
		window.clearTimeout(previewTimer);
		previewTimer = null;
	}
}

function schedulePreview(): void {
	cancelPreviewTimer();
	previewHintEl.textContent = "Auto-preview queued";
	previewTimer = window.setTimeout(() => {
		void previewPdf();
	}, PREVIEW_DEBOUNCE_MS);
}

async function previewPdf({
	immediate = false,
}: {
	immediate?: boolean;
} = {}): Promise<void> {
	cancelPreviewTimer();

	const payload = getPayload();
	const token = ++previewRequestToken;

	if (previewController) {
		previewController.abort();
	}

	previewController = new AbortController();
	previewHintEl.textContent = immediate ? "Manual refresh" : "Auto-preview";
	setPreviewStatus("Updating preview...");
	setPreviewOverlay("Rendering preview...", false, true);

	try {
		const response = await generateLabelPdfLabelsPdfPost({
			body: payload,
			signal: previewController.signal,
			throwOnError: true,
		});
		const blob = response.data;

		if (token !== previewRequestToken) {
			return;
		}

		if (currentPdfBlobUrl) {
			URL.revokeObjectURL(currentPdfBlobUrl);
		}

		currentPdfBlobUrl = URL.createObjectURL(blob);
		previewFrame.src = currentPdfBlobUrl;
		previewFrame.classList.remove("invisible");
		setPreviewStatus("Preview synced.");
		setPreviewOverlay("", false, false);
	} catch (error) {
		if (isCanceledError(error) || token !== previewRequestToken) {
			return;
		}

		console.error(error);
		const message = getErrorMessage(error);
		setPreviewStatus("Preview failed.", true);
		setPreviewOverlay(message, true, true);
	}
}

async function saveProfile(): Promise<void> {
	setStatus("Saving profile...");

	try {
		const payload = getPayload();
		const response = currentProfileId
			? await updateProfileEndpointApiProfilesProfileIdPut({
					body: payload,
					path: { profile_id: currentProfileId },
					throwOnError: true,
				})
			: await createProfileEndpointApiProfilesPost({
					body: payload,
					throwOnError: true,
				});

		renderState(response.data);
		setStatus("Profile saved.");
		await previewPdf({ immediate: true });
	} catch (error) {
		console.error(error);
		setStatus(getErrorMessage(error), true);
	}
}

async function deleteProfile(): Promise<void> {
	if (!currentProfileId) {
		setStatus("Draft profile is not saved yet.", true);
		return;
	}

	setStatus("Deleting profile...");

	try {
		const response = await deleteProfileEndpointApiProfilesProfileIdDelete({
			path: { profile_id: currentProfileId },
			throwOnError: true,
		});
		renderState(response.data);
		setStatus("Profile deleted.");
		await previewPdf({ immediate: true });
	} catch (error) {
		console.error(error);
		setStatus(getErrorMessage(error), true);
	}
}

async function selectProfile(profileId: string): Promise<void> {
	setStatus("Loading profile...");

	try {
		const response = await selectProfileEndpointApiProfilesProfileIdSelectPost({
			path: { profile_id: profileId },
			throwOnError: true,
		});
		renderState(response.data);
		setStatus("Profile loaded.");
		await previewPdf({ immediate: true });
	} catch (error) {
		console.error(error);
		setStatus(getErrorMessage(error), true);
	}
}

async function printLabel(): Promise<void> {
	setStatus("Applying printer settings and sending job...");

	try {
		const response = await printLabelPrintPost({
			body: getPayload(),
			throwOnError: true,
		});
		const result: PrintJobResult = response.data;
		setStatus(`Print submitted: ${result.stdout || result.queue}`);
	} catch (error) {
		console.error(error);
		setStatus(`Print failed: ${getErrorMessage(error)}`, true);
	}
}

function bindSingleChoiceButtons(
	selector: string,
	targetProperty: "level" | "alignment",
	datasetProperty: "rowLevel" | "rowAlignment",
): void {
	for (const button of Array.from(
		document.querySelectorAll<HTMLButtonElement>(selector),
	)) {
		button.addEventListener("click", () => {
			syncActiveRowFromEditor();
			draftRows[activeRowIndex][targetProperty] =
				button.dataset[datasetProperty] ?? "";
			renderRowsUI();
			schedulePreview();
		});
	}
}

function bindToggleButton(
	button: HTMLButtonElement,
	propertyName: "bold" | "italic",
): void {
	button.addEventListener("click", () => {
		syncActiveRowFromEditor();
		draftRows[activeRowIndex][propertyName] =
			!draftRows[activeRowIndex][propertyName];
		renderRowsUI();
		schedulePreview();
	});
}

for (const button of tabButtons) {
	button.addEventListener("click", () => {
		currentTab = button.dataset.tabButton ?? "profile";
		updateTabState();
	});
}

newProfileButton.addEventListener("click", startNewProfile);
saveButton.addEventListener("click", () => {
	void saveProfile();
});
deleteButton.addEventListener("click", () => {
	void deleteProfile();
});
previewButton.addEventListener("click", () => {
	void previewPdf({ immediate: true });
});
printButton.addEventListener("click", () => {
	void printLabel();
});
profilePicker.addEventListener("change", () => {
	if (profilePicker.value) {
		void selectProfile(profilePicker.value);
	}
});

continuousToggle.addEventListener("click", () => {
	continuousInput.checked = !continuousInput.checked;
	updateContinuousLabel();
	schedulePreview();
});

borderToggle.addEventListener("click", () => {
	borderInput.checked = !borderInput.checked;
	updateBorderToggle();
	schedulePreview();
});

for (const input of Array.from(
	document.querySelectorAll<HTMLElement>("[data-autopreview]"),
)) {
	const eventName = input.tagName === "SELECT" ? "change" : "input";
	input.addEventListener(eventName, schedulePreview);
}

addRowButton.addEventListener("click", () => {
	syncActiveRowFromEditor();
	draftRows.push({
		text: "",
		level: "normal",
		bold: false,
		italic: false,
		alignment: "left",
	});
	activeRowIndex = draftRows.length - 1;
	renderRowsUI();
	schedulePreview();
});

deleteRowButton.addEventListener("click", () => {
	if (draftRows.length === 1) {
		return;
	}

	syncActiveRowFromEditor();
	draftRows.splice(activeRowIndex, 1);
	activeRowIndex = Math.max(0, activeRowIndex - 1);
	renderRowsUI();
	schedulePreview();
});

rowText.addEventListener("input", () => {
	syncActiveRowFromEditor();
	renderRowList();
	schedulePreview();
});

bindSingleChoiceButtons("[data-row-level]", "level", "rowLevel");
bindSingleChoiceButtons("[data-row-alignment]", "alignment", "rowAlignment");
bindToggleButton(rowBoldButton, "bold");
bindToggleButton(rowItalicButton, "italic");

updateTabState();
setStatus("Loading label profiles...");
setPreviewStatus("Waiting for preview...");
setPreviewOverlay("Loading profile...");

async function loadState(): Promise<void> {
	try {
		const response = await getStateApiStateGet({ throwOnError: true });
		renderState(response.data);
		setStatus("Profiles loaded.");
		await previewPdf({ immediate: true });
	} catch (error) {
		console.error(error);
		const message = getErrorMessage(error);
		setStatus(message, true);
		setPreviewStatus("Preview unavailable.", true);
		setPreviewOverlay(message, true, true);
	}
}

void loadState();
