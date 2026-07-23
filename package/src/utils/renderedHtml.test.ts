import { describe, expect, it } from "vitest";
import { renderedHtml } from "./renderedHtml.js";

describe("renderedHtml", () => {
	it("wraps a single src in a plain lilypond img tag", () => {
		expect(renderedHtml(["/_lilypond/abc123.svg"])).toBe(
			'<img data-lilypond-image src="/_lilypond/abc123.svg" alt="">',
		);
	});

	it("wraps multiple srcs in an <ol><li> of lilypond img tags, in order", () => {
		expect(
			renderedHtml([
				"/_lilypond/abc123.svg",
				"/_lilypond/abc123-p2.svg",
				"/_lilypond/abc123-p3.svg",
			]),
		).toBe(
			"<ol data-lilypond-group>" +
				'<li><img data-lilypond-image src="/_lilypond/abc123.svg" alt=""></li>' +
				'<li><img data-lilypond-image src="/_lilypond/abc123-p2.svg" alt=""></li>' +
				'<li><img data-lilypond-image src="/_lilypond/abc123-p3.svg" alt=""></li>' +
				"</ol>",
		);
	});
});
