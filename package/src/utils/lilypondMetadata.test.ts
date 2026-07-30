import { describe, expect, it } from "vitest";
import { toLilypondMetadata } from "./lilypondMetadata.js";

describe("toLilypondMetadata", () => {
	it("returns an empty object for no input", () => {
		expect(toLilypondMetadata({})).toEqual({});
	});

	it("keeps standard fields at the top level", () => {
		expect(
			toLilypondMetadata({ title: "Sonata", composer: "Beethoven" }),
		).toEqual({
			title: "Sonata",
			composer: "Beethoven",
		});
	});

	it("keeps non-standard fields at the top level too, alongside standard ones", () => {
		expect(
			toLilypondMetadata({
				title: "Jesu, meine Freude",
				mutopiacomposer: "BachJS",
				maintainerEmail: "urs@ursmetzger.de",
			}),
		).toEqual({
			title: "Jesu, meine Freude",
			mutopiacomposer: "BachJS",
			maintainerEmail: "urs@ursmetzger.de",
		});
	});
});
