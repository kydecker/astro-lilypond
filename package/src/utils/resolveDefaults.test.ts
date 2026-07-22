import { describe, expect, it } from "vitest";
import { resolveDefaults } from "./resolveDefaults.js";

describe("resolveDefaults", () => {
	it("fills in every field when defaults is undefined", () => {
		expect(resolveDefaults(undefined)).toEqual({
			version: "2.26.0",
			resolution: 144,
			crop: true,
		});
	});

	it("overrides only the fields that are set", () => {
		expect(resolveDefaults({ resolution: 300 })).toEqual({
			version: "2.26.0",
			resolution: 300,
			crop: true,
		});
	});
});
