import { describe, expect, it } from "vitest";
import { altTextForBlock } from "./altTextForBlock.js";

describe("altTextForBlock", () => {
	it("derives alt text from \\header title/composer when there's no meta override", () => {
		expect(
			altTextForBlock(
				undefined,
				'\\header { title = "Sonata" composer = "Beethoven" }',
			),
		).toBe("Sonata, by Beethoven");
	});

	it("prefers a meta alt= override over \\header-derived alt text", () => {
		expect(
			altTextForBlock('alt="Custom"', '\\header { title = "Sonata" }'),
		).toBe("Custom");
	});

	it('an explicit meta alt="" forces decorative alt even when a header is present', () => {
		expect(altTextForBlock('alt=""', '\\header { title = "Sonata" }')).toBe("");
	});

	it("is empty when there's neither a header nor a meta override", () => {
		expect(altTextForBlock(undefined, "\\score { }")).toBe("");
	});
});
