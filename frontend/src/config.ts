import {
	getConfigApiConfigGet,
	getConfigOptionsApiConfigOptionsGet,
	saveConfigApiConfigPost,
} from "../client/sdk.gen";
import type {
	GetConfigOptionsApiConfigOptionsGetResponse,
	QueueState,
} from "../client/types.gen";
import { configureApiClient, getErrorMessage } from "./api";

configureApiClient();

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
	configStateEl.textContent = JSON.stringify(data, null, 2);
}

function renderQueueOptions(
	data: GetConfigOptionsApiConfigOptionsGetResponse,
): void {
	queueOptionsEl.textContent = JSON.stringify(data, null, 2);
}

async function loadConfig(): Promise<void> {
	setStatus("Loading queues...");

	try {
		const response = await getConfigApiConfigGet({ throwOnError: true });
		renderConfig(response.data);
		setStatus("Queues loaded.");
	} catch (error) {
		console.error(error);
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
	queueOptionsEl.textContent = "Loading queue options...";

	try {
		const response = await getConfigOptionsApiConfigOptionsGet({
			query: { queue_name: queueSelect.value },
			throwOnError: true,
		});
		renderQueueOptions(response.data);
		setStatus(`Queue options loaded for ${queueSelect.value}.`);
	} catch (error) {
		console.error(error);
		queueOptionsEl.textContent = getErrorMessage(error);
		setStatus(getErrorMessage(error), true);
	}
});

stockWidthInput.addEventListener("input", updateStockSummary);
stockLengthInput.addEventListener("input", updateStockSummary);
stockContinuousInput.addEventListener("change", () => {
	updateLengthVisibility();
	updateStockSummary();
});

void loadConfig();
