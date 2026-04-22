import { defineConfig, devices } from "@playwright/test";

const port = 4173;

export default defineConfig({
	testDir: "./tests/playwright",
	timeout: 30_000,
	retries: 0,
	reporter: "line",
	use: {
		...devices["iPhone 8"],
		baseURL: `http://127.0.0.1:${port}`,
		trace: "on-first-retry",
	},
	webServer: {
		command: `node tests/playwright/static-app-server.mjs ${port}`,
		port,
		reuseExistingServer: !process.env.CI,
		timeout: 30_000,
	},
});
