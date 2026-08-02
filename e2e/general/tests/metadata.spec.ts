import { expect, test } from "@playwright/test";

// Matches e2e/src/scores/metadata.ly and e2e/src/scores/collection/metadata.ly.
const EXPECTED_META: Record<string, string> = {
	title: "Metadata Fixture",
	composer: "Ada Fixture",
	poet: "Grace Header",
	instrument: "Glass Harmonica",
	opus: "Op. 1",
	customtag: "Custom Value",
};

for (const [path, source] of [
	["/score-metadata", "a direct .ly import"],
	["/collection-metadata", "a lilypondLoader() content-collection entry"],
] as const) {
	test(`exposes standard and custom \\header fields from ${source}`, async ({
		page,
	}) => {
		await page.goto(path);
		for (const [field, value] of Object.entries(EXPECTED_META)) {
			await expect(page.getByTestId(`meta-${field}`)).toHaveText(value);
		}
	});
}
