import { expect, test } from "@playwright/test";

test("includePaths lets \\include resolve a file from a directory other than the score's own", async ({
	page,
}) => {
	await page.goto("/score-include-paths");
	const img = page.locator("[data-lilypond-image]");
	await expect(img).toHaveCount(1);
	await expect(img).toHaveAttribute("src", /\.svg$/);
});
