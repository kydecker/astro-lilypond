import { describe, expect, it } from "vitest";
import { splitHeaderFields } from "./splitHeaderFields.js";

describe("splitHeaderFields", () => {
	it("returns an empty extra bag for no input", () => {
		expect(splitHeaderFields({})).toEqual({ extra: {} });
	});

	it("places standard fields at the top level", () => {
		expect(
			splitHeaderFields({ title: "Sonata", composer: "Beethoven" }),
		).toEqual({
			title: "Sonata",
			composer: "Beethoven",
			extra: {},
		});
	});

	it("places non-standard fields under extra", () => {
		expect(
			splitHeaderFields({
				title: "Jesu, meine Freude",
				mutopiacomposer: "BachJS",
				maintainerEmail: "urs@ursmetzger.de",
			}),
		).toEqual({
			title: "Jesu, meine Freude",
			extra: {
				mutopiacomposer: "BachJS",
				maintainerEmail: "urs@ursmetzger.de",
			},
		});
	});

	it("handles a mix of every standard field and several extras", () => {
		expect(
			splitHeaderFields({
				dedication: "Carin Levine",
				title: "CARY",
				subtitle: "extract",
				subsubtitle: "sub-sub",
				instrument: "bass flute",
				poet: "Someone",
				composer: "Trevor Baca",
				meter: "4/4",
				arranger: "Someone Else",
				piece: "I",
				opus: "Op. 1",
				copyright: "Copyright 2006",
				tagline: "false",
				source: "Mutopia",
				style: "Baroque",
			}),
		).toEqual({
			dedication: "Carin Levine",
			title: "CARY",
			subtitle: "extract",
			subsubtitle: "sub-sub",
			instrument: "bass flute",
			poet: "Someone",
			composer: "Trevor Baca",
			meter: "4/4",
			arranger: "Someone Else",
			piece: "I",
			opus: "Op. 1",
			copyright: "Copyright 2006",
			tagline: "false",
			extra: { source: "Mutopia", style: "Baroque" },
		});
	});
});
