import { expect, test } from "@playwright/test";

test("render()'s pageCount reflects the emitted page count, not just the source's", async ({
	page,
}) => {
	await page.goto("/render-page-count");

	await expect(page.getByTestId("single-page-count")).toHaveText("1");
	await expect(page.getByTestId("uncropped-page-count")).toHaveText("2");
	// crop: true merges pages into a single image, so pageCount drops to 1
	// even though the source itself has 2 pages.
	await expect(page.getByTestId("cropped-page-count")).toHaveText("1");
});

test("page shapes match pageCount: bare <img> for single/cropped, <ol><li> for uncropped multi-page", async ({
	page,
}) => {
	await page.goto("/render-page-count");

	const groups = page.locator("[data-lilypond-group]");
	await expect(groups).toHaveCount(1);
	await expect(groups.locator("li")).toHaveCount(2);

	// 1 (single) + 2 (uncropped's <ol><li>) + 1 (cropped) = 4 total.
	await expect(page.locator("[data-lilypond-image]")).toHaveCount(4);
});
