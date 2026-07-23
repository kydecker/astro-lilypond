import { describe, expect, it } from "vitest";
import { parseLyImportQuery } from "./lyImportQuery.js";

describe("parseLyImportQuery", () => {
	it("returns the id unchanged as pathname with no cropOverride when there's no query string", () => {
		expect(parseLyImportQuery("/project/src/score.ly")).toEqual({
			pathname: "/project/src/score.ly",
			cropOverride: undefined,
		});
	});

	it("strips the query string from pathname", () => {
		expect(parseLyImportQuery("/project/src/score.ly?crop")).toEqual({
			pathname: "/project/src/score.ly",
			cropOverride: true,
		});
	});

	it("resolves ?crop to cropOverride: true", () => {
		expect(parseLyImportQuery("/score.ly?crop")?.cropOverride).toBe(true);
	});

	it("resolves ?nocrop to cropOverride: false", () => {
		expect(parseLyImportQuery("/score.ly?nocrop")?.cropOverride).toBe(false);
	});

	it("prefers ?crop over ?nocrop when both are somehow present", () => {
		expect(parseLyImportQuery("/score.ly?crop&nocrop")?.cropOverride).toBe(
			true,
		);
	});

	it("resolves an empty query string to cropOverride: undefined", () => {
		expect(parseLyImportQuery("/score.ly?")).toEqual({
			pathname: "/score.ly",
			cropOverride: undefined,
		});
	});

	it("returns undefined when the query string carries a param this plugin doesn't own", () => {
		expect(parseLyImportQuery("/score.ly?raw")).toBeUndefined();
		expect(parseLyImportQuery("/score.ly?url")).toBeUndefined();
	});

	it("returns undefined when an unrecognized param is mixed in with a recognized one", () => {
		expect(parseLyImportQuery("/score.ly?crop&raw")).toBeUndefined();
	});
});
