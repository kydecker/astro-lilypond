import { describe, expect, it } from "vitest";
import { resolveDefaults } from "../resolveDefaults.js";

describe("resolveDefaults", () => {
	it("fills in every field when defaults is undefined", () => {
		expect(resolveDefaults(undefined)).toEqual({
			version: "2.26.0",
			format: "svg",
			backend: "cairo",
			resolution: 144,
			cropScale: 1.5,
		});
	});

	it("overrides only the fields that are set", () => {
		expect(resolveDefaults({ resolution: 300 })).toEqual({
			version: "2.26.0",
			format: "svg",
			backend: "cairo",
			resolution: 300,
			cropScale: 1.5,
		});
	});

	it("passes through an explicitly-set version", () => {
		expect(resolveDefaults({ version: "2.24.0" })).toEqual({
			version: "2.24.0",
			format: "svg",
			backend: "cairo",
			resolution: 144,
			cropScale: 1.5,
		});
	});

	it("passes through an explicitly-set format", () => {
		expect(resolveDefaults({ format: "png" })).toEqual({
			version: "2.26.0",
			format: "png",
			backend: "cairo",
			resolution: 144,
			cropScale: 1.5,
		});
	});

	it("passes through an explicitly-set cropScale", () => {
		expect(resolveDefaults({ cropScale: 2 })).toEqual({
			version: "2.26.0",
			format: "svg",
			backend: "cairo",
			resolution: 144,
			cropScale: 2,
		});
	});

	it("passes through an explicitly-set backend", () => {
		expect(resolveDefaults({ backend: "ps" })).toEqual({
			version: "2.26.0",
			format: "svg",
			backend: "ps",
			resolution: 144,
			cropScale: 1.5,
		});
	});
});
