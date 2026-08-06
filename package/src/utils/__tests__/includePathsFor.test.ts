import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { includePathsFor } from "../includePathsFor.js";

describe("includePathsFor", () => {
	it("returns [] for undefined", () => {
		expect(includePathsFor(undefined)).toEqual([]);
	});

	it("returns [] for null", () => {
		expect(includePathsFor(null)).toEqual([]);
	});

	it("returns [] for an empty string", () => {
		expect(includePathsFor("")).toEqual([]);
	});

	it("returns the containing directory for a string path", () => {
		expect(includePathsFor("/docs/src/examples/bach.ly")).toEqual([
			"/docs/src/examples",
		]);
	});

	it("returns the containing directory for a file:// URL", () => {
		const url = pathToFileURL("/docs/src/examples/bach.ly");
		expect(includePathsFor(url)).toEqual(["/docs/src/examples"]);
	});

	it("returns '.' for a bare filename with no directory component", () => {
		expect(includePathsFor("bach.ly")).toEqual(["."]);
	});

	it("appends extra paths after the source's directory", () => {
		expect(
			includePathsFor("/docs/src/examples/bach.ly", ["/other/dir"]),
		).toEqual(["/docs/src/examples", "/other/dir"]);
	});

	it("returns extra paths as-is when the source is unknown", () => {
		expect(includePathsFor(undefined, ["/other/dir"])).toEqual(["/other/dir"]);
	});

	it("defaults extra to [] when omitted", () => {
		expect(includePathsFor("/docs/bach.ly")).toEqual(["/docs"]);
	});
});
