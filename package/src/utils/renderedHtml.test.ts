import { describe, expect, it } from "vitest";
import { renderedHtml } from "./renderedHtml.js";

describe("renderedHtml", () => {
	it("wraps a single src in a plain lilypond img tag", () => {
		expect(renderedHtml(["/_lilypond/abc123.svg"], "")).toBe(
			'<img data-lilypond-image src="/_lilypond/abc123.svg" alt="">',
		);
	});

	it("wraps multiple srcs in an <ol><li> of lilypond img tags, in order", () => {
		expect(
			renderedHtml(
				[
					"/_lilypond/abc123.svg",
					"/_lilypond/abc123-p2.svg",
					"/_lilypond/abc123-p3.svg",
				],
				"",
			),
		).toBe(
			"<ol data-lilypond-group>" +
				'<li><img data-lilypond-image src="/_lilypond/abc123.svg" alt=""></li>' +
				'<li><img data-lilypond-image src="/_lilypond/abc123-p2.svg" alt=""></li>' +
				'<li><img data-lilypond-image src="/_lilypond/abc123-p3.svg" alt=""></li>' +
				"</ol>",
		);
	});

	it("applies a non-empty alt to a single page", () => {
		expect(renderedHtml(["/_lilypond/abc123.svg"], "Sonata")).toBe(
			'<img data-lilypond-image src="/_lilypond/abc123.svg" alt="Sonata">',
		);
	});

	it("applies the same alt text to every image in a group", () => {
		expect(
			renderedHtml(
				["/_lilypond/abc123.svg", "/_lilypond/abc123-p2.svg"],
				"Sonata",
			),
		).toBe(
			"<ol data-lilypond-group>" +
				'<li><img data-lilypond-image src="/_lilypond/abc123.svg" alt="Sonata"></li>' +
				'<li><img data-lilypond-image src="/_lilypond/abc123-p2.svg" alt="Sonata"></li>' +
				"</ol>",
		);
	});

	it("escapes special characters in the alt attribute", () => {
		expect(renderedHtml(["/_lilypond/abc123.svg"], 'Bach & "Sons"')).toBe(
			'<img data-lilypond-image src="/_lilypond/abc123.svg" alt="Bach &amp; &quot;Sons&quot;">',
		);
	});

	it("keeps alt empty on every page when the base alt is empty", () => {
		expect(
			renderedHtml(["/_lilypond/abc123.svg", "/_lilypond/abc123-p2.svg"], ""),
		).toBe(
			"<ol data-lilypond-group>" +
				'<li><img data-lilypond-image src="/_lilypond/abc123.svg" alt=""></li>' +
				'<li><img data-lilypond-image src="/_lilypond/abc123-p2.svg" alt=""></li>' +
				"</ol>",
		);
	});
});
