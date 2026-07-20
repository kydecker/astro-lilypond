import { describe, expect, it } from "vitest";
import { PAPER_SIZES } from "./paperSizes.js";

describe("PAPER_SIZES", () => {
	it("includes the default paper size", () => {
		expect(PAPER_SIZES).toContain("a4");
	});

	it("has no duplicate entries", () => {
		expect(new Set(PAPER_SIZES).size).toBe(PAPER_SIZES.length);
	});
});
