import { describe, expect, it } from "vitest";
import { contentHashFor } from "./contentHashFor.js";

const BASE = {
	source: "\\score { }",
	format: "svg" as const,
	resolution: 144,
	crop: true,
};

describe("contentHashFor", () => {
	it("returns a 6-character lowercase hex string", () => {
		const hash = contentHashFor(BASE);
		expect(hash).toMatch(/^[0-9a-f]{6}$/);
	});

	it("is deterministic for identical input", () => {
		expect(contentHashFor(BASE)).toBe(contentHashFor({ ...BASE }));
	});

	it("changes when source changes", () => {
		expect(contentHashFor(BASE)).not.toBe(
			contentHashFor({ ...BASE, source: "\\score { c }" }),
		);
	});

	it("changes when format changes", () => {
		expect(contentHashFor(BASE)).not.toBe(
			contentHashFor({ ...BASE, format: "png" }),
		);
	});

	it("changes when resolution changes", () => {
		expect(contentHashFor(BASE)).not.toBe(
			contentHashFor({ ...BASE, resolution: 300 }),
		);
	});

	it("changes when crop changes", () => {
		expect(contentHashFor(BASE)).not.toBe(
			contentHashFor({ ...BASE, crop: false }),
		);
	});
});
