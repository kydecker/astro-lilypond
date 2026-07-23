import { describe, expect, it } from "vitest";
import { imageDimensionsFor } from "./imageDimensions.js";

function fakePng(width: number, height: number): Buffer {
	const buf = Buffer.alloc(24);
	buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0); // signature
	buf.writeUInt32BE(13, 8); // IHDR chunk length
	buf.write("IHDR", 12, "ascii");
	buf.writeUInt32BE(width, 16);
	buf.writeUInt32BE(height, 20);
	return buf;
}

describe("imageDimensionsFor", () => {
	it("reads width/height from an svg's root element", () => {
		const svg = Buffer.from(
			'<svg xmlns="http://www.w3.org/2000/svg" width="157.5" height="82.5" viewBox="0 0 105 55">content</svg>',
		);

		expect(imageDimensionsFor("svg", svg)).toEqual({ width: 158, height: 83 });
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
		expect(imageDimensionsFor("png", fakePng(640, 480))).toEqual({
			width: 640,
			height: 480,
		});
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
