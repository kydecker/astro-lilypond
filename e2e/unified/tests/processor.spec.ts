import { expect, test } from "@playwright/test";

test("markdown fences render through the remark plugin under the unified processor", async ({
	page,
}) => {
	await page.goto("/fence-lang-tags");
	const img = page.locator("[data-lilypond-image]");
	await expect(img).toHaveCount(1);
	await expect(img).toHaveAttribute("alt", "Unified Fence Score");
});
