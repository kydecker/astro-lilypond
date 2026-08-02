import { expect, test } from "@playwright/test";

test("an .mdx page renders both a lilypond fence and a directly-used <Score>", async ({
	page,
}) => {
	await page.goto("/mdx-fence-and-component");

	const images = page.locator("[data-lilypond-image]");
	await expect(images).toHaveCount(2);

	// The fence goes through the remark/Sätteri plugin path and is always
	// cropped, deriving its alt text from \header.
	await expect(images.nth(0)).toHaveAttribute("alt", "MDX Fence Score");

	// The imported .ly's own \header (title + composer) drives its <Score>'s
	// alt text, independent of the fence above it.
	await expect(images.nth(1)).toHaveAttribute("alt", "Simple Fixture, by E2E");
});
