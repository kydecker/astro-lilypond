import { expect, test } from "@playwright/test";

test("lilypondLoader() content-collection entry renders through <Score>", async ({
	page,
}) => {
	await page.goto("/collection");
	await expect(
		page.getByRole("heading", { name: "Collection Fixture" }),
	).toBeVisible();
	const img = page.locator("[data-lilypond-image]");
	await expect(img).toHaveCount(1);
	await expect(img).toHaveAttribute("alt", "Collection Fixture");
});
