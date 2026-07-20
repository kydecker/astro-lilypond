import { describe, expect, it } from "vitest";
import { resolveDefaults } from "./resolveDefaults.js";

describe("resolveDefaults", () => {
	it("fills in every field when defaults is undefined", () => {
		expect(resolveDefaults(undefined)).toEqual({
			version: "2.26.0",
			resolution: 144,
			crop: false,
			staffSize: 20,
			paperSize: "a4",
		});
	});

	it("overrides only the fields that are set", () => {
		expect(resolveDefaults({ resolution: 300, staffSize: 16 })).toEqual({
			version: "2.26.0",
			resolution: 300,
			crop: false,
			staffSize: 16,
			paperSize: "a4",
		});
	});
});
