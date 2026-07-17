import { describe, expect, it } from "vitest";
import { isLilypondLang } from "../../src/util.js";

describe("isLilypondLang", () => {
	it.each(["lilypond", "ly", "ily"])("returns true for '%s'", (lang) => {
		expect(isLilypondLang(lang)).toBe(true);
	});

	it.each(["js", "ts", "python", "lilypond2", "lily", ""])(
		"returns false for '%s'",
		(lang) => {
			expect(isLilypondLang(lang)).toBe(false);
		},
	);

	it("returns false for null", () => {
		expect(isLilypondLang(null)).toBe(false);
	});

	it("returns false for undefined", () => {
		expect(isLilypondLang(undefined)).toBe(false);
	});
});
