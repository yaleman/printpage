import {
	getConfigApiConfigGet,
	getConfigOptionsApiConfigOptionsGet,
	getQueueStatusApiQueueStatusGet,
	saveConfigApiConfigPost,
} from "../client/sdk.gen";
import type {
	GetConfigOptionsApiConfigOptionsGetResponse,
	QueueState,
	QueueStatus,
} from "../client/types.gen";
import { configureApiClient, getErrorMessage } from "./api";

configureApiClient();

const COPY_BUTTON_RESET_DELAY_MS = 1500;
const QUEUE_STATUS_POLL_MS = 10_000;
const JSON_TOKEN_PATTERN =
	/("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\btrue\b|\bfalse\b|\bnull\b)/g;

type JsonPanel = {
	copyButton: HTMLButtonElement;
	copyText: string;
	element: HTMLElement;
	resetTimer: number | null;
};

function requireElement<T extends HTMLElement>(id: string): T {
	const element = document.getElementById(id);
	if (!element) {
		throw new Error(`Missing required element: ${id}`);
	}

	return element as T;
}

function formatMm(value: number | null | undefined): string {
	return `${Number(value ?? 0)} mm`;
}

function describeStock(
	data: Pick<
		QueueState,
		"stock_is_continuous" | "stock_length_mm" | "stock_width_mm"
	>,
): string {
	return data.stock_is_continuous
		? `Continuous ${formatMm(data.stock_width_mm)} roll is loaded.`
		: `${formatMm(data.stock_width_mm)} x ${formatMm(data.stock_length_mm)} fixed labels are loaded.`;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function highlightJson(json: string): string {
	let html = "";
	let lastIndex = 0;

	for (const match of json.matchAll(JSON_TOKEN_PATTERN)) {
		const matchedText = match[0];
		const matchIndex = match.index ?? 0;
		let tokenClass = "json-number";

		html += escapeHtml(json.slice(lastIndex, matchIndex));

		if (matchedText.startsWith('"')) {
			tokenClass = matchedText.endsWith(":") ? "json-key" : "json-string";
		} else if (matchedText === "true" || matchedText === "false") {
			tokenClass = "json-boolean";
		} else if (matchedText === "null") {
			tokenClass = "json-null";
		}

		html += `<span class="${tokenClass}">${escapeHtml(matchedText)}</span>`;
		lastIndex = matchIndex + matchedText.length;
	}

	html += escapeHtml(json.slice(lastIndex));
	return html;
}

function formatJson(value: unknown): string {
	return JSON.stringify(value, null, 2);
}

function resetCopyLabel(panel: JsonPanel): void {
	if (panel.resetTimer !== null) {
		window.clearTimeout(panel.resetTimer);
	}

	panel.resetTimer = window.setTimeout(() => {
		panel.copyButton.textContent = "Copy";
		panel.resetTimer = null;
	}, COPY_BUTTON_RESET_DELAY_MS);
}

function renderPlainText(panel: JsonPanel, text: string): void {
	panel.copyText = text;
	panel.element.textContent = text;
}

function renderHighlightedJson(panel: JsonPanel, value: unknown): void {
	const json = formatJson(value);
	panel.copyText = json;
	panel.element.innerHTML = highlightJson(json);
}

const configForm = requireElement<HTMLFormElement>("config-form");
const queueSelect = requireElement<HTMLSelectElement>("queue_name");
const stockWidthInput = requireElement<HTMLInputElement>("stock_width_mm");
const stockContinuousInput = requireElement<HTMLInputElement>(
	"stock_is_continuous",
);
const stockLengthGroup = requireElement<HTMLElement>("stock-length-group");
const stockLengthInput = requireElement<HTMLInputElement>("stock_length_mm");
const stockSummaryEl = requireElement<HTMLElement>("stock-summary");
const queryOptionsButton = requireElement<HTMLButtonElement>(
	"query-options-button",
);
const refreshButton = requireElement<HTMLButtonElement>("refresh-button");
const statusEl = requireElement<HTMLElement>("status");
const configStateEl = requireElement<HTMLElement>("config-state");
const queueOptionsEl = requireElement<HTMLElement>("queue-options");
const queueStatusIndicator = requireElement<HTMLElement>(
	"queue-status-indicator",
);
const queueStatusText = requireElement<HTMLElement>("queue-status-text");
const copyConfigStateButton =
	requireElement<HTMLButtonElement>("copy-config-state");
const copyQueueOptionsButton =
	requireElement<HTMLButtonElement>("copy-queue-options");

const configStatePanel: JsonPanel = {
	copyButton: copyConfigStateButton,
	copyText: configStateEl.textContent ?? "",
	element: configStateEl,
	resetTimer: null,
};
const queueOptionsPanel: JsonPanel = {
	copyButton: copyQueueOptionsButton,
	copyText: queueOptionsEl.textContent ?? "",
	element: queueOptionsEl,
	resetTimer: null,
};
let queueStatusPollTimer: number | null = null;
let queueStatusRequestInFlight = false;

function setQueueStatusIndicator(
	message: string,
	state: "loading" | "idle" | "queued" | "offline" | "error",
	title = "",
): void {
	queueStatusIndicator.dataset.state = state;
	queueStatusIndicator.title = title;
	queueStatusText.textContent = message;
}

function renderQueueStatus(status: QueueStatus): void {
	const jobIds = status.job_ids ?? [];
	const queuedJobs = Number(status.queued_jobs ?? jobIds.length);
	const isOnline = Boolean(status.is_online);
	const message = !isOnline
		? queuedJobs === 0
			? "Offline"
			: `Offline • ${queuedJobs} queued`
		: queuedJobs === 0
			? "Online"
			: `Online • ${queuedJobs} queued`;
	const titleParts = [
		`${status.queue_name}: ${status.status ?? "unknown"}`,
		status.detail,
		jobIds.length ? `Jobs: ${jobIds.join(", ")}` : "No queued jobs.",
	].filter(Boolean);

	setQueueStatusIndicator(
		message,
		!isOnline ? "offline" : queuedJobs === 0 ? "idle" : "queued",
		titleParts.join(" "),
	);
}

async function refreshQueueStatus({
	showLoading = false,
}: {
	showLoading?: boolean;
} = {}): Promise<void> {
	if (queueStatusRequestInFlight) {
		return;
	}

	const queueName = queueSelect.value;
	queueStatusRequestInFlight = true;
	if (showLoading) {
		setQueueStatusIndicator("Checking...", "loading");
	}

	try {
		const response = await getQueueStatusApiQueueStatusGet({
			query: queueName ? { queue_name: queueName } : undefined,
			throwOnError: true,
		});
		renderQueueStatus(response.data);
	} catch (error) {
		console.error(error);
		setQueueStatusIndicator("Unavailable", "error", getErrorMessage(error));
	} finally {
		queueStatusRequestInFlight = false;
	}
}

function startQueueStatusPolling(): void {
	if (queueStatusPollTimer !== null) {
		return;
	}

	void refreshQueueStatus({ showLoading: true });
	queueStatusPollTimer = window.setInterval(() => {
		void refreshQueueStatus();
	}, QUEUE_STATUS_POLL_MS);
}

function setStatus(message: string, isError = false): void {
	statusEl.textContent = message;
	statusEl.dataset.state = isError ? "error" : "idle";
}

function updateLengthVisibility(): void {
	const isContinuous = stockContinuousInput.checked;
	stockLengthGroup.classList.toggle("hidden", isContinuous);
	stockLengthInput.disabled = isContinuous;
	stockLengthInput.required = !isContinuous;
}

function updateStockSummary(): void {
	stockSummaryEl.textContent = describeStock({
		stock_width_mm: Number(stockWidthInput.value || 0),
		stock_is_continuous: stockContinuousInput.checked,
		stock_length_mm: stockContinuousInput.checked
			? null
			: Number(stockLengthInput.value || 0),
	});
}

function renderConfig(data: QueueState): void {
	queueSelect.innerHTML = "";

	for (const queue of data.queues ?? []) {
		const option = document.createElement("option");
		option.value = queue;
		option.textContent = queue;

		if (queue === data.queue_name) {
			option.selected = true;
		}

		queueSelect.appendChild(option);
	}

	stockWidthInput.value = String(data.stock_width_mm);
	stockContinuousInput.checked = Boolean(data.stock_is_continuous);
	stockLengthInput.value =
		data.stock_length_mm == null ? "" : String(data.stock_length_mm);
	updateLengthVisibility();
	updateStockSummary();
	renderHighlightedJson(configStatePanel, data);
	void refreshQueueStatus({ showLoading: true });
}

function renderQueueOptions(
	data: GetConfigOptionsApiConfigOptionsGetResponse,
): void {
	renderHighlightedJson(queueOptionsPanel, data);
}

async function copyPanelText(panel: JsonPanel): Promise<void> {
	try {
		await navigator.clipboard.writeText(panel.copyText);
		panel.copyButton.textContent = "Copied";
	} catch (error) {
		console.error(error);
		panel.copyButton.textContent = "Copy failed";
	}

	resetCopyLabel(panel);
}

async function loadConfig(): Promise<void> {
	setStatus("Loading queues...");
	renderPlainText(configStatePanel, "Loading...");

	try {
		const response = await getConfigApiConfigGet({ throwOnError: true });
		renderConfig(response.data);
		setStatus("Queues loaded.");
	} catch (error) {
		console.error(error);
		renderPlainText(configStatePanel, getErrorMessage(error));
		setStatus(getErrorMessage(error), true);
	}
}

configForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	setStatus("Saving printer settings...");

	try {
		const response = await saveConfigApiConfigPost({
			body: {
				queue_name: queueSelect.value,
				stock_width_mm: Number(stockWidthInput.value),
				stock_is_continuous: stockContinuousInput.checked,
				stock_length_mm: stockContinuousInput.checked
					? null
					: Number(stockLengthInput.value),
			},
			throwOnError: true,
		});
		renderConfig(response.data);
		setStatus("Printer settings saved.");
		await refreshQueueStatus();
	} catch (error) {
		console.error(error);
		setStatus(getErrorMessage(error), true);
	}
});

refreshButton.addEventListener("click", () => {
	void loadConfig();
});

queryOptionsButton.addEventListener("click", async () => {
	setStatus(`Querying ${queueSelect.value} options...`);
	renderPlainText(queueOptionsPanel, "Loading queue options...");

	try {
		const response = await getConfigOptionsApiConfigOptionsGet({
			query: { queue_name: queueSelect.value },
			throwOnError: true,
		});
		renderQueueOptions(response.data);
		setStatus(`Queue options loaded for ${queueSelect.value}.`);
	} catch (error) {
		console.error(error);
		renderPlainText(queueOptionsPanel, getErrorMessage(error));
		setStatus(getErrorMessage(error), true);
	}
});

copyConfigStateButton.addEventListener("click", () => {
	void copyPanelText(configStatePanel);
});

copyQueueOptionsButton.addEventListener("click", () => {
	void copyPanelText(queueOptionsPanel);
});

stockWidthInput.addEventListener("input", updateStockSummary);
stockLengthInput.addEventListener("input", updateStockSummary);
stockContinuousInput.addEventListener("change", () => {
	updateLengthVisibility();
	updateStockSummary();
});
queueSelect.addEventListener("change", () => {
	void refreshQueueStatus({ showLoading: true });
});

setQueueStatusIndicator("Checking...", "loading");
startQueueStatusPolling();
void loadConfig();
