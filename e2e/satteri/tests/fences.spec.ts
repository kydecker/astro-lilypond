import { expect, test } from "@playwright/test";

test.describe("markdown fence language tags", () => {
	test("renders lilypond, ly, and ily fences with alt text from \\header", async ({
		page,
	}) => {
		await page.goto("/fence-lang-tags");
		const images = page.locator("[data-lilypond-image]");
		await expect(images).toHaveCount(4);

		await expect(images.nth(0)).toHaveAttribute("alt", "Lilypond Tag Score");
		await expect(images.nth(1)).toHaveAttribute("alt", "Ly Tag Score");
		await expect(images.nth(2)).toHaveAttribute("alt", "Ily Tag Score");
	});

	test('an explicit alt="..." fence meta overrides the \\header-derived alt', async ({
		page,
	}) => {
		await page.goto("/fence-lang-tags");
		const images = page.locator("[data-lilypond-image]");
		await expect(images.nth(3)).toHaveAttribute("alt", "Custom Alt Text");
	});
});
