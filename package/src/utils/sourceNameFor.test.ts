import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { sourceNameFor } from "./sourceNameFor.js";

describe("sourceNameFor", () => {
	it("returns undefined for undefined", () => {
		expect(sourceNameFor(undefined)).toBeUndefined();
	});

	it("returns undefined for null", () => {
		expect(sourceNameFor(null)).toBeUndefined();
	});

	it("returns undefined for an empty string", () => {
		expect(sourceNameFor("")).toBeUndefined();
	});

	it("returns the base file name for a string path", () => {
		expect(sourceNameFor("/docs/src/examples/bach.ly")).toBe("bach.ly");
	});

	it("returns the base file name for a file:// URL", () => {
		const url = pathToFileURL("/docs/src/examples/bach.ly");
		expect(sourceNameFor(url)).toBe("bach.ly");
	});

	it("returns the string as-is when it's already a bare filename", () => {
		expect(sourceNameFor("bach.ly")).toBe("bach.ly");
	});
});
