import { describe, expect, it } from "vitest";
import { titleFor } from "./titleFor.js";

describe("titleFor", () => {
	it("strips the extension from a source file name", () => {
		expect(titleFor("bach-bwv610.ly")).toBe("bach-bwv610");
	});

	it("strips the extension from a markdown file name", () => {
		expect(titleFor("usage.mdx")).toBe("usage");
	});

	it("falls back to 'score' when sourceName is undefined", () => {
		expect(titleFor(undefined)).toBe("score");
	});

	it("replaces unsafe characters with a dash", () => {
		expect(titleFor("weird name!!.ly")).toBe("weird-name");
	});

	it("collapses consecutive dashes", () => {
		expect(titleFor("a--b.ly")).toBe("a-b");
	});

	it("trims leading and trailing dashes", () => {
		expect(titleFor("-leading-trailing-.ly")).toBe("leading-trailing");
	});

	it("falls back to 'score' when sanitizing leaves nothing", () => {
		expect(titleFor("!!!.ly")).toBe("score");
	});
});
