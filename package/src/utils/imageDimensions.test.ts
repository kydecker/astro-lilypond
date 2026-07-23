import { describe, expect, it } from "vitest";
import { imageDimensionsFor } from "./imageDimensions.js";

// 4x3 pixel PNG (single solid color) inlined as base64.
const PNG_4X3_B64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAQAAAADAQMAAACOOjyFAAAAA1BMVEX/VZlX/YvGAAAAC0lEQVQI12NgAAEAAAYAAWb0yWwAAAAASUVORK5CYII=";

describe("imageDimensionsFor", () => {
	it("reads width/height from an svg's root element", () => {
		const svg = Buffer.from(
			'<svg xmlns="http://www.w3.org/2000/svg" width="157.5" height="82.5" viewBox="0 0 105 55">content</svg>',
		);

		expect(imageDimensionsFor("svg", svg)).toEqual({
			width: 157.5,
			height: 82.5,
		});
	});

	it("returns undefined when the svg has no width/height attributes", () => {
		expect(
			imageDimensionsFor("svg", Buffer.from("<svg>fake</svg>")),
		).toBeUndefined();
	});

	it("returns undefined for non-svg content passed as svg", () => {
		expect(
			imageDimensionsFor("svg", Buffer.from("not an svg")),
		).toBeUndefined();
	});

	it("reads width/height from a png's IHDR chunk", () => {
		const png = Buffer.from(PNG_4X3_B64, "base64");
		expect(imageDimensionsFor("png", png)).toEqual({ width: 4, height: 3 });
	});

	it("returns undefined for a buffer too short to contain an IHDR chunk", () => {
		expect(
			imageDimensionsFor("png", Buffer.from([0x89, 0x50])),
		).toBeUndefined();
	});

	it("returns undefined when the PNG signature doesn't match", () => {
		expect(imageDimensionsFor("png", Buffer.alloc(24))).toBeUndefined();
	});
});
