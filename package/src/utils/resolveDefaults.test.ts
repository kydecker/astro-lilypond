import { describe, expect, it } from "vitest";
import { resolveDefaults } from "./resolveDefaults.js";

describe("resolveDefaults", () => {
	it("fills in every field when defaults is undefined", () => {
		expect(resolveDefaults(undefined)).toEqual({
			version: "2.26.0",
			resolution: 144,
			crop: "markdown-only",
		});
	});

	it("overrides only the fields that are set", () => {
		expect(resolveDefaults({ resolution: 300 })).toEqual({
			version: "2.26.0",
			resolution: 300,
			crop: "markdown-only",
		});
	});

	it("passes through an explicitly-set version", () => {
		expect(resolveDefaults({ version: "2.24.0" })).toEqual({
			version: "2.24.0",
			resolution: 144,
			crop: "markdown-only",
		});
	});

	it("passes through an explicitly-set crop of false", () => {
		expect(resolveDefaults({ crop: false })).toEqual({
			version: "2.26.0",
			resolution: 144,
			crop: false,
		});
	});

	it("passes through an explicitly-set crop of true", () => {
		expect(resolveDefaults({ crop: true })).toEqual({
			version: "2.26.0",
			resolution: 144,
			crop: true,
		});
	});
});
