import {
	getConfigApiConfigGet,
	saveConfigApiConfigPost,
} from "../client/sdk.gen";
import type { QueueState } from "../client/types.gen";
import { configureApiClient, getErrorMessage } from "./api";

configureApiClient();

function requireElement<T extends HTMLElement>(id: string): T {
	const element = document.getElementById(id);
	if (!element) {
		throw new Error(`Missing required element: ${id}`);
	}

	return element as T;
}

const configForm = requireElement<HTMLFormElement>("config-form");
const queueSelect = requireElement<HTMLSelectElement>("queue_name");
const refreshButton = requireElement<HTMLButtonElement>("refresh-button");
const statusEl = requireElement<HTMLElement>("status");
const configStateEl = requireElement<HTMLElement>("config-state");

function setStatus(message: string, isError = false): void {
	statusEl.textContent = message;
	statusEl.dataset.state = isError ? "error" : "idle";
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

	configStateEl.textContent = JSON.stringify(data, null, 2);
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
	setStatus("Saving queue...");

	try {
		const response = await saveConfigApiConfigPost({
			body: { queue_name: queueSelect.value },
			throwOnError: true,
		});
		renderConfig(response.data);
		setStatus("Queue saved.");
	} catch (error) {
		console.error(error);
		setStatus(getErrorMessage(error), true);
	}
});

refreshButton.addEventListener("click", () => {
	void loadConfig();
});

void loadConfig();
