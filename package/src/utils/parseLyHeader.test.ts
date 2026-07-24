import { describe, expect, it } from "vitest";
import {
	extractMarkupText,
	parseLyHeader,
	parseLyHeaderFields,
} from "./parseLyHeader.js";

describe("parseLyHeader", () => {
	it("returns {} for source with no \\header block", () => {
		expect(parseLyHeader("\\relative c' { c d e f }")).toEqual({});
	});

	it("extracts title only", () => {
		expect(parseLyHeader('\\header { title = "Sonata" }')).toEqual({
			title: "Sonata",
		});
	});

	it("extracts composer only", () => {
		expect(parseLyHeader('\\header { composer = "Beethoven" }')).toEqual({
			composer: "Beethoven",
		});
	});

	it("extracts both title and composer", () => {
		expect(
			parseLyHeader(
				'\\header {\n  title = "Sonata"\n  composer = "Beethoven"\n}',
			),
		).toEqual({ title: "Sonata", composer: "Beethoven" });
	});

	it("handles escaped quotes inside a value", () => {
		expect(parseLyHeader('\\header { title = "Sonata \\"No. 14\\"" }')).toEqual(
			{ title: 'Sonata "No. 14"' },
		);
	});

	it("extracts a \\markup-valued title (formatting commands stripped) alongside a sibling composer string", () => {
		expect(
			parseLyHeader(
				'\\header { title = \\markup { \\bold "Sonata" } composer = "Beethoven" }',
			),
		).toEqual({ title: "Sonata", composer: "Beethoven" });
	});

	it("doesn't truncate on nested braces inside an unrelated markup field", () => {
		expect(
			parseLyHeader(
				'\\header { subtitle = \\markup { \\column { "a" "b" } } title = "Sonata" }',
			),
		).toEqual({ title: "Sonata" });
	});

	it("ignores fields other than title/composer", () => {
		expect(
			parseLyHeader('\\header { opus = "Op. 27" arranger = "Someone" }'),
		).toEqual({});
	});

	it("returns {} for an unterminated \\header block", () => {
		expect(parseLyHeader('\\header { title = "Sonata"')).toEqual({});
	});

	it("uses the last \\header block's value when the same field appears in multiple blocks", () => {
		// Mirrors LilyPond's own header scope chain, where a later/inner block
		// (e.g. a per-\score header) overrides an earlier/outer one.
		expect(
			parseLyHeader(
				'\\header { title = "First" }\n\\header { title = "Second" }',
			),
		).toEqual({ title: "Second" });
	});

	it("merges a top-level header with a nested \\score header, with the score header taking precedence", () => {
		expect(
			parseLyHeader(
				'\\header { title = "Book" composer = "Bach" }\n' +
					'\\score {\n  \\header { title = "Movement 1" }\n  { c4 }\n}',
			),
		).toEqual({ title: "Movement 1", composer: "Bach" });
	});

	it("extracts fields from a \\header block nested inside \\score, including \\markup-valued ones", () => {
		expect(
			parseLyHeaderFields(
				"\\score {\n" +
					"  \\header {\n" +
					'    piece = \\markup { \\fontsize #4 \\bold "PRAELUDIUM I" }\n' +
					'    opus = \\markup { \\italic "BWV 846" }\n' +
					"  }\n" +
					"  { s1 }\n" +
					"}",
			),
		).toEqual({ piece: "PRAELUDIUM I", opus: "BWV 846" });
	});

	it("treats a whitespace-only value as absent", () => {
		expect(parseLyHeader('\\header { title = "   " }')).toEqual({});
	});

	it("ignores a literal brace inside a quoted value and still finds a sibling field", () => {
		expect(
			parseLyHeader(
				'\\header { title = "Op. 27 (Moonlight}" composer = "Beethoven" }',
			),
		).toEqual({ title: "Op. 27 (Moonlight}", composer: "Beethoven" });
	});
});

describe("parseLyHeaderFields", () => {
	it("splits fields across a top-level header and a nested \\score header, last-wins", () => {
		expect(
			parseLyHeaderFields(
				'\\header { title = "Book" composer = "Bach" }\n' +
					'\\score {\n  \\header { title = "Movement 1" opus = "Op. 1" }\n  { c4 }\n}',
			),
		).toEqual({
			title: "Movement 1",
			composer: "Bach",
			opus: "Op. 1",
		});
	});

	it("excludes an unbraced \\markup value (no reliable end delimiter)", () => {
		expect(
			parseLyHeaderFields('\\header { tagline = \\markup \\bold "Sonata" }'),
		).toEqual({});
	});

	it("excludes a scheme boolean value", () => {
		expect(parseLyHeaderFields("\\header { tagline = ##f }")).toEqual({});
	});
});

describe("extractMarkupText", () => {
	it("strips a command and a numeric scheme argument, keeping the quoted string", () => {
		expect(extractMarkupText('\\fontsize #4 \\bold "PRAELUDIUM I"')).toBe(
			"PRAELUDIUM I",
		);
	});

	it("strips a command, keeping the quoted string", () => {
		expect(extractMarkupText('\\italic "BWV 846"')).toBe("BWV 846");
	});

	it("skips a balanced-paren scheme literal like #'(0 . 3)", () => {
		expect(extractMarkupText('\\override #\'(0 . 3) \\bold "Op. 1"')).toBe(
			"Op. 1",
		);
	});

	it("flattens nested brace groups, keeping each quoted string", () => {
		expect(extractMarkupText('\\column { "a" "b" }')).toBe("a b");
	});

	it("keeps bare words alongside quoted/formatted text", () => {
		expect(extractMarkupText("\\italic Sorcery (extract)")).toBe(
			"Sorcery (extract)",
		);
	});

	it("returns an empty string for markup with no extractable text", () => {
		expect(extractMarkupText("\\bold #4")).toBe("");
	});
});
