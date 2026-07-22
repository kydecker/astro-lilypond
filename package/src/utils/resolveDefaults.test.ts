import { describe, expect, it } from "vitest";
import { resolveDefaults } from "./resolveDefaults.js";

describe("resolveDefaults", () => {
	it("fills in resolution/crop but leaves version undefined when defaults is undefined", () => {
		expect(resolveDefaults(undefined)).toEqual({
			version: undefined,
			resolution: 144,
			crop: true,
		});
	});

	it("overrides only the fields that are set", () => {
		expect(resolveDefaults({ resolution: 300 })).toEqual({
			version: undefined,
			resolution: 300,
			crop: true,
		});
	});

	it("passes through an explicitly-set version", () => {
		expect(resolveDefaults({ version: "2.24.0" })).toEqual({
			version: "2.24.0",
			resolution: 144,
			crop: true,
		});
	});
});
