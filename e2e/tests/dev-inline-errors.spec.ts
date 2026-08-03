import { expect, test } from "@playwright/test";

test("a broken markdown-fence score renders inline instead of crashing the dev server, leaving the rest of the page intact", async ({
	page,
}) => {
	const response = await page.goto("/");

	expect(response?.status()).toBe(200);
	await expect(page.getByText("LilyPond failed to render")).toBeVisible();
	await expect(page.locator("[data-lilypond-image]")).toHaveCount(1);
});

test("a broken <Score> renders inline instead of crashing the dev server, leaving a sibling <Score> intact", async ({
	page,
}) => {
	const response = await page.goto("/score-component");

	expect(response?.status()).toBe(200);
	await expect(page.getByText("LilyPond failed to render")).toBeVisible();
	await expect(page.locator("[data-lilypond-image]")).toHaveCount(1);
});
