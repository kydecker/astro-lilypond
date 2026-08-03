import { expect, test } from "@playwright/test";

// Matches e2e/astro.config.mjs's `defaults.cropScale`.
const CROP_SCALE = 2;

test("default format is svg, single page renders a bare <img>", async ({
	page,
}) => {
	await page.goto("/score-basic");
	await expect(page.locator("[data-lilypond-group]")).toHaveCount(0);
	const img = page.locator("[data-lilypond-image]");
	await expect(img).toHaveCount(1);
	await expect(img).toHaveAttribute("src", /\.svg$/);
});

test("format: png changes the asset extension", async ({ page }) => {
	await page.goto("/score-png");
	const img = page.locator("[data-lilypond-image]");
	await expect(img).toHaveAttribute("src", /\.png$/);
});

test("uncropped multi-page scores render an <ol> of <li><img>", async ({
	page,
}) => {
	await page.goto("/score-multipage");
	const group = page.locator("[data-lilypond-group]");
	await expect(group).toHaveCount(1);
	const items = group.locator("li");
	await expect(items).toHaveCount(2);
	await expect(items.locator("[data-lilypond-image]")).toHaveCount(2);
});

test("pageLimit truncates the rendered pages", async ({ page }) => {
	await page.goto("/score-page-limit");
	// A single remaining page collapses back to a bare <img>, not an <ol>.
	await expect(page.locator("[data-lilypond-group]")).toHaveCount(0);
	await expect(page.locator("[data-lilypond-image]")).toHaveCount(1);
});

test("crop: true merges pages into a single image scaled by cropScale", async ({
	page,
	request,
}) => {
	await page.goto("/score-cropped");
	await expect(page.locator("[data-lilypond-group]")).toHaveCount(0);
	const img = page.locator("[data-lilypond-image]");
	await expect(img).toHaveCount(1);

	const [src, widthAttr, heightAttr] = await Promise.all([
		img.getAttribute("src"),
		img.getAttribute("width"),
		img.getAttribute("height"),
	]);
	expect(src).toBeTruthy();

	// The <img> width/height are the raw SVG asset's own dimensions
	// multiplied by cropScale; the asset file itself is never rewritten.
	const svgResponse = await request.get(src as string);
	const svgText = await svgResponse.text();
	const openTag = svgText.match(/<svg\b[^>]*>/)?.[0] ?? "";
	const rawWidth = Number(openTag.match(/\bwidth="([\d.]+)"/)?.[1]);
	const rawHeight = Number(openTag.match(/\bheight="([\d.]+)"/)?.[1]);
	expect(rawWidth).toBeGreaterThan(0);
	expect(rawHeight).toBeGreaterThan(0);

	expect(Number(widthAttr)).toBeCloseTo(rawWidth * CROP_SCALE, 1);
	expect(Number(heightAttr)).toBeCloseTo(rawHeight * CROP_SCALE, 1);
});

test("class/style land on <img> for a single page and on <ol> for multiple pages", async ({
	page,
}) => {
	await page.goto("/score-styled");

	const singleImg = page.locator("img.single-page-score");
	await expect(singleImg).toHaveCount(1);
	await expect(singleImg).toHaveAttribute("style", /border: 1px solid red/);

	const multiGroup = page.locator("ol.multi-page-score");
	await expect(multiGroup).toHaveCount(1);
	await expect(multiGroup).toHaveAttribute("style", /border: 2px solid blue/);
	// class/style land on the <ol>, not on each inner <img>, for multi-page.
	const innerImg = multiGroup.locator("img").first();
	await expect(innerImg).not.toHaveClass(/multi-page-score/);
});
