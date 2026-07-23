import { describe, expect, it } from "vitest";
import { renderedHtml } from "./renderedHtml.js";

describe("renderedHtml", () => {
	it("wraps a single page in a plain lilypond img tag", () => {
		expect(
			renderedHtml(
				[{ url: "/_lilypond/abc123.svg", width: undefined, height: undefined }],
				"",
			),
		).toBe('<img data-lilypond-image src="/_lilypond/abc123.svg" alt="">');
	});

	it("includes width/height attributes when known", () => {
		expect(
			renderedHtml(
				[{ url: "/_lilypond/abc123.svg", width: 158, height: 83 }],
				"",
			),
		).toBe(
			'<img data-lilypond-image src="/_lilypond/abc123.svg" width="158" height="83" alt="">',
		);
	});

	it("omits width/height entirely when either is unknown", () => {
		expect(
			renderedHtml(
				[{ url: "/_lilypond/abc123.svg", width: 158, height: undefined }],
				"",
			),
		).toBe('<img data-lilypond-image src="/_lilypond/abc123.svg" alt="">');
	});

	it("wraps multiple pages in an <ol><li> of lilypond img tags, in order", () => {
		expect(
			renderedHtml(
				[
					{ url: "/_lilypond/abc123.svg", width: 100, height: 50 },
					{ url: "/_lilypond/abc123-p2.svg", width: 100, height: 60 },
					{ url: "/_lilypond/abc123-p3.svg", width: 100, height: 70 },
				],
				"",
			),
		).toBe(
			"<ol data-lilypond-group>" +
				'<li><img data-lilypond-image src="/_lilypond/abc123.svg" width="100" height="50" alt=""></li>' +
				'<li><img data-lilypond-image src="/_lilypond/abc123-p2.svg" width="100" height="60" alt=""></li>' +
				'<li><img data-lilypond-image src="/_lilypond/abc123-p3.svg" width="100" height="70" alt=""></li>' +
				"</ol>",
		);
	});

	it("applies a non-empty alt to a single page", () => {
		expect(
			renderedHtml(
				[{ url: "/_lilypond/abc123.svg", width: undefined, height: undefined }],
				"Sonata",
			),
		).toBe(
			'<img data-lilypond-image src="/_lilypond/abc123.svg" alt="Sonata">',
		);
	});

	it("applies the same alt text to every image in a group", () => {
		expect(
			renderedHtml(
				[
					{ url: "/_lilypond/abc123.svg", width: undefined, height: undefined },
					{
						url: "/_lilypond/abc123-p2.svg",
						width: undefined,
						height: undefined,
					},
				],
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
		expect(
			renderedHtml(
				[{ url: "/_lilypond/abc123.svg", width: undefined, height: undefined }],
				'Bach & "Sons"',
			),
		).toBe(
			'<img data-lilypond-image src="/_lilypond/abc123.svg" alt="Bach &amp; &quot;Sons&quot;">',
		);
	});

	it("keeps alt empty on every page when the base alt is empty", () => {
		expect(
			renderedHtml(
				[
					{ url: "/_lilypond/abc123.svg", width: undefined, height: undefined },
					{
						url: "/_lilypond/abc123-p2.svg",
						width: undefined,
						height: undefined,
					},
				],
				"",
			),
		).toBe(
			"<ol data-lilypond-group>" +
				'<li><img data-lilypond-image src="/_lilypond/abc123.svg" alt=""></li>' +
				'<li><img data-lilypond-image src="/_lilypond/abc123-p2.svg" alt=""></li>' +
				"</ol>",
		);
	});
});
