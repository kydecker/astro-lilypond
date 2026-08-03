import { expect, test } from "@playwright/test";

test("render()'s pdf: true option produces a downloadable, valid PDF file alongside the Score", async ({
	page,
	request,
}) => {
	await page.goto("/score-pdf");
	await expect(page.locator("[data-lilypond-image]")).toHaveCount(1);

	const href = await page.getByTestId("pdf-link").getAttribute("href");
	expect(href).toBeTruthy();

	const response = await request.get(href as string);
	expect(response.ok()).toBe(true);
	const bytes = await response.body();
	expect(bytes.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
});
