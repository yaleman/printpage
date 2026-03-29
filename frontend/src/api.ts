import axios from "axios";

import { client } from "../client/client.gen";

let isConfigured = false;

export function configureApiClient(): void {
	if (isConfigured) {
		return;
	}

	client.setConfig({
		axios: axios.create({
			baseURL: window.location.origin,
		}),
	});
	isConfigured = true;
}

export function getErrorMessage(error: unknown): string {
	if (axios.isAxiosError(error)) {
		const responseData = error.response?.data;

		if (typeof responseData === "string" && responseData.trim()) {
			return responseData;
		}

		if (responseData && typeof responseData === "object") {
			return JSON.stringify(responseData, null, 2);
		}

		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

export function isCanceledError(error: unknown): boolean {
	return axios.isAxiosError(error) && error.code === "ERR_CANCELED";
}
