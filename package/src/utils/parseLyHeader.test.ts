import { describe, expect, it } from "vitest";
import { parseLyHeader } from "./parseLyHeader.js";

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

	it("skips a \\markup-valued title but still finds a sibling composer string", () => {
		expect(
			parseLyHeader(
				'\\header { title = \\markup { \\bold "Sonata" } composer = "Beethoven" }',
			),
		).toEqual({ composer: "Beethoven" });
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

	it("only reads the first \\header block when multiple are present", () => {
		expect(
			parseLyHeader(
				'\\header { title = "First" }\n\\header { title = "Second" }',
			),
		).toEqual({ title: "First" });
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
