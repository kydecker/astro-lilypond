import { describe, expect, it } from "vitest";
import { assetsUrlBaseFor } from "./assetsUrlBaseFor.js";

describe("assetsUrlBaseFor", () => {
	it("joins a root base with the output dir name", () => {
		expect(assetsUrlBaseFor("/", "_lilypond")).toBe("/_lilypond");
	});

	it("joins a base without a trailing slash", () => {
		expect(assetsUrlBaseFor("/docs", "_lilypond")).toBe("/docs/_lilypond");
	});

	it("joins a base with a trailing slash without doubling it", () => {
		expect(assetsUrlBaseFor("/docs/", "_lilypond")).toBe("/docs/_lilypond");
	});

	it("supports a custom output dir name", () => {
		expect(assetsUrlBaseFor("/", "scores")).toBe("/scores");
	});
});
