import { describe, expect, it } from "vitest";
import { altTextFor } from "./altTextFor.js";

describe("altTextFor", () => {
	it('composes "{title}, by {composer}" when both are present', () => {
		expect(altTextFor({ title: "Sonata", composer: "Beethoven" })).toBe(
			"Sonata, by Beethoven",
		);
	});

	it("returns just the title when there's no composer", () => {
		expect(altTextFor({ title: "Sonata" })).toBe("Sonata");
	});

	it('returns "Sheet music by {composer}" when there\'s no title', () => {
		expect(altTextFor({ composer: "Beethoven" })).toBe(
			"Sheet music by Beethoven",
		);
	});

	it("returns an empty string when neither is present", () => {
		expect(altTextFor({})).toBe("");
	});
});
