import { expect, test } from "@playwright/test";

const statePayload = {
	queue_name: "Brother_QL700",
	stock_width_mm: 62,
	stock_is_continuous: false,
	stock_length_mm: 29,
	selected_profile_id: "default-profile",
	profiles: [
		{
			id: "default-profile",
			name: "Shipping label",
			width_mm: 62,
			height_mm: 29,
			orientation: "portrait",
			cut_every: 1,
			quality: "BrQuality",
			quantity: 1,
			border: {
				enabled: false,
				thickness_mm: 0.5,
				inset_mm: 1,
				radius_mm: 1.5,
			},
			rows: [
				{
					text: "Fragile",
					level: "h2",
					bold: true,
					italic: false,
					alignment: "center",
				},
			],
		},
	],
};

async function mockApp(page: import("@playwright/test").Page) {
	await page.route("**/api/state", async (route) => {
		await route.fulfill({
			contentType: "application/json",
			body: JSON.stringify(statePayload),
		});
	});

	await page.route("**/api/queue-status**", async (route) => {
		await route.fulfill({
			contentType: "application/json",
			body: JSON.stringify({
				queue_name: "Brother_QL700",
				is_detected: true,
				is_online: true,
				status: "idle",
				detail: "printer Brother_QL700 is idle.",
				job_ids: [],
				queued_jobs: 0,
			}),
		});
	});

	await page.route("**/labels.pdf", async (route) => {
		await route.fulfill({
			contentType: "application/pdf",
			body: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"),
		});
	});
}

test.beforeEach(async ({ page }) => {
	await mockApp(page);
	await page.goto("/");
	await expect(page.getByText("Profiles loaded.")).toBeVisible();
});

test("phone layout stacks key profile controls and keeps settings out of the header", async ({
	page,
}) => {
	const hasHorizontalOverflow = await page.evaluate(() => {
		return document.documentElement.scrollWidth > document.documentElement.clientWidth;
	});
	expect(hasHorizontalOverflow).toBe(false);

	await expect(
		page.locator("header").getByRole("link", { name: /settings/i }),
	).toHaveCount(0);

	const widthBox = await page.locator("#width_mm").boundingBox();
	const heightBox = await page.locator("#height_mm").boundingBox();
	const qualityBox = await page.locator("#quality").boundingBox();
	const cutEveryBox = await page.locator("#cut_every").boundingBox();
	const borderThicknessBox = await page
		.locator("#border_thickness_mm")
		.boundingBox();
	const borderInsetBox = await page.locator("#border_inset_mm").boundingBox();

	expect(widthBox).not.toBeNull();
	expect(heightBox).not.toBeNull();
	expect(qualityBox).not.toBeNull();
	expect(cutEveryBox).not.toBeNull();
	expect(borderThicknessBox).not.toBeNull();
	expect(borderInsetBox).not.toBeNull();

	expect(heightBox.y).toBeGreaterThan(widthBox.y + 20);
	expect(cutEveryBox.y).toBeGreaterThan(qualityBox.y + 20);
	expect(borderInsetBox.y).toBeGreaterThan(borderThicknessBox.y + 20);

	await page.getByRole("button", { name: "Open menu" }).click();
	await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
	await expect(page.getByRole("link", { name: /settings/i })).toBeVisible();
});

test("phone content tab stacks row list above the active row editor", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Content" }).click();

	const rowListBox = await page.locator("#row-list").boundingBox();
	const rowTextBox = await page.locator("#row-text").boundingBox();

	expect(rowListBox).not.toBeNull();
	expect(rowTextBox).not.toBeNull();
	expect(rowTextBox.y).toBeGreaterThan(rowListBox.y + rowListBox.height - 8);
	expect(Math.abs(rowTextBox.x - rowListBox.x)).toBeLessThan(24);
});
