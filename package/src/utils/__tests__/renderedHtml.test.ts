import { describe, expect, it } from "vitest";
import { renderedHtml } from "../renderedHtml.js";

describe("renderedHtml", () => {
	it("wraps a single page in a plain lilypond img tag", () => {
		expect(
			renderedHtml(
				[{ src: "/_lilypond/abc123.svg", width: undefined, height: undefined }],
				"",
			),
		).toBe('<img data-lilypond-image src="/_lilypond/abc123.svg" alt>');
	});

	it("includes width/height attributes when known", () => {
		expect(
			renderedHtml(
				[{ src: "/_lilypond/abc123.svg", width: 158, height: 83 }],
				"",
			),
		).toBe(
			'<img data-lilypond-image src="/_lilypond/abc123.svg" width="158" height="83" alt>',
		);
	});

	it("includes whichever of width/height is known, independently of the other", () => {
		expect(
			renderedHtml(
				[{ src: "/_lilypond/abc123.svg", width: 158, height: undefined }],
				"",
			),
		).toBe(
			'<img data-lilypond-image src="/_lilypond/abc123.svg" width="158" alt>',
		);
	});

	it("wraps multiple pages in an <ol><li> of lilypond img tags, in order", () => {
		expect(
			renderedHtml(
				[
					{ src: "/_lilypond/abc123.svg", width: 100, height: 50 },
					{ src: "/_lilypond/abc123-p2.svg", width: 100, height: 60 },
					{ src: "/_lilypond/abc123-p3.svg", width: 100, height: 70 },
				],
				"",
			),
		).toBe(
			"<ol data-lilypond-group>" +
				'<li><img data-lilypond-image src="/_lilypond/abc123.svg" width="100" height="50" alt></li>' +
				'<li><img data-lilypond-image src="/_lilypond/abc123-p2.svg" width="100" height="60" alt></li>' +
				'<li><img data-lilypond-image src="/_lilypond/abc123-p3.svg" width="100" height="70" alt></li>' +
				"</ol>",
		);
	});

	it("applies a non-empty alt to a single page", () => {
		expect(
			renderedHtml(
				[{ src: "/_lilypond/abc123.svg", width: undefined, height: undefined }],
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
					{ src: "/_lilypond/abc123.svg", width: undefined, height: undefined },
					{
						src: "/_lilypond/abc123-p2.svg",
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
				[{ src: "/_lilypond/abc123.svg", width: undefined, height: undefined }],
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
					{ src: "/_lilypond/abc123.svg", width: undefined, height: undefined },
					{
						src: "/_lilypond/abc123-p2.svg",
						width: undefined,
						height: undefined,
					},
				],
				"",
			),
		).toBe(
			"<ol data-lilypond-group>" +
				'<li><img data-lilypond-image src="/_lilypond/abc123.svg" alt></li>' +
				'<li><img data-lilypond-image src="/_lilypond/abc123-p2.svg" alt></li>' +
				"</ol>",
		);
	});

	describe("class/style/pageLimit options", () => {
		it("applies class and style to a single page's img", () => {
			expect(
				renderedHtml(
					[{ src: "/a.svg", width: undefined, height: undefined }],
					"",
					{ class: "extra", style: "width: 50%" },
				),
			).toBe(
				'<img data-lilypond-image class="extra" src="/a.svg" alt style="width: 50%">',
			);
		});

		it("applies class and style to the <ol>, not the individual <li><img>s", () => {
			expect(
				renderedHtml(
					[
						{ src: "/a.svg", width: undefined, height: undefined },
						{ src: "/b.svg", width: undefined, height: undefined },
					],
					"",
					{ class: "extra", style: "width: 50%" },
				),
			).toBe(
				'<ol data-lilypond-group class="extra" style="width: 50%">' +
					'<li><img data-lilypond-image src="/a.svg" alt></li>' +
					'<li><img data-lilypond-image src="/b.svg" alt></li>' +
					"</ol>",
			);
		});

		it("escapes special characters in class/style", () => {
			expect(
				renderedHtml(
					[{ src: "/a.svg", width: undefined, height: undefined }],
					"",
					{ class: '"onmouseover=alert(1)' },
				),
			).toBe(
				'<img data-lilypond-image class="&quot;onmouseover=alert(1)" src="/a.svg" alt>',
			);
		});

		it("limits rendered pages to pageLimit", () => {
			expect(
				renderedHtml(
					[
						{ src: "/a.svg", width: undefined, height: undefined },
						{ src: "/b.svg", width: undefined, height: undefined },
						{ src: "/c.svg", width: undefined, height: undefined },
					],
					"",
					{ pageLimit: 2 },
				),
			).toBe(
				"<ol data-lilypond-group>" +
					'<li><img data-lilypond-image src="/a.svg" alt></li>' +
					'<li><img data-lilypond-image src="/b.svg" alt></li>' +
					"</ol>",
			);
		});

		it("a pageLimit of 1 collapses to a plain single img, not a one-item <ol>", () => {
			expect(
				renderedHtml(
					[
						{ src: "/a.svg", width: undefined, height: undefined },
						{ src: "/b.svg", width: undefined, height: undefined },
					],
					"",
					{ pageLimit: 1 },
				),
			).toBe('<img data-lilypond-image src="/a.svg" alt>');
		});

		it("a pageLimit of 0 renders nothing, rather than an empty <ol>", () => {
			expect(
				renderedHtml(
					[
						{ src: "/a.svg", width: undefined, height: undefined },
						{ src: "/b.svg", width: undefined, height: undefined },
					],
					"",
					{ pageLimit: 0 },
				),
			).toBe("");
		});
	});

	describe("loading/decoding/fetchpriority hints", () => {
		it("omits the hints by default (non-breaking)", () => {
			expect(
				renderedHtml(
					[{ src: "/a.svg", width: undefined, height: undefined }],
					"",
				),
			).toBe('<img data-lilypond-image src="/a.svg" alt>');
		});

		it("forwards loading onto a single-page <img>", () => {
			expect(
				renderedHtml(
					[{ src: "/a.svg", width: undefined, height: undefined }],
					"",
					{ loading: "lazy" },
				),
			).toBe('<img data-lilypond-image src="/a.svg" alt loading="lazy">');
		});

		it("forwards decoding onto a single-page <img>", () => {
			expect(
				renderedHtml(
					[{ src: "/a.svg", width: undefined, height: undefined }],
					"",
					{ decoding: "async" },
				),
			).toBe('<img data-lilypond-image src="/a.svg" alt decoding="async">');
		});

		it("forwards fetchpriority onto a single-page <img>", () => {
			expect(
				renderedHtml(
					[{ src: "/a.svg", width: undefined, height: undefined }],
					"",
					{ fetchpriority: "high" },
				),
			).toBe('<img data-lilypond-image src="/a.svg" alt fetchpriority="high">');
		});

		it("forwards all three onto a single-page <img> with class/style preserved", () => {
			expect(
				renderedHtml(
					[{ src: "/a.svg", width: undefined, height: undefined }],
					"",
					{
						class: "hero",
						style: "width: 50%",
						loading: "lazy",
						decoding: "async",
						fetchpriority: "high",
					},
				),
			).toBe(
				'<img data-lilypond-image class="hero" src="/a.svg" alt loading="lazy" decoding="async" fetchpriority="high" style="width: 50%">',
			);
		});

		it("forwards loading/decoding/fetchpriority onto every <img> in a multi-page group", () => {
			expect(
				renderedHtml(
					[
						{ src: "/a.svg", width: 100, height: 50 },
						{ src: "/b.svg", width: 100, height: 60 },
					],
					"Sonata",
					{ loading: "lazy", decoding: "async", fetchpriority: "low" },
				),
			).toBe(
				"<ol data-lilypond-group>" +
					'<li><img data-lilypond-image src="/a.svg" width="100" height="50" alt="Sonata" loading="lazy" decoding="async" fetchpriority="low"></li>' +
					'<li><img data-lilypond-image src="/b.svg" width="100" height="60" alt="Sonata" loading="lazy" decoding="async" fetchpriority="low"></li>' +
					"</ol>",
			);
		});

		it("only adds the hints that are provided", () => {
			expect(
				renderedHtml(
					[{ src: "/a.svg", width: undefined, height: undefined }],
					"",
					{ decoding: "async" },
				),
			).toBe('<img data-lilypond-image src="/a.svg" alt decoding="async">');
		});

		describe("priority", () => {
			it("sets loading=eager, decoding=sync, fetchpriority=high when no hints are given", () => {
				expect(
					renderedHtml(
						[{ src: "/a.svg", width: undefined, height: undefined }],
						"",
						{ priority: true },
					),
				).toBe(
					'<img data-lilypond-image src="/a.svg" alt loading="eager" decoding="sync" fetchpriority="high">',
				);
			});

			it("applies the same priority defaults to every <img> in a multi-page group", () => {
				expect(
					renderedHtml(
						[
							{ src: "/a.svg", width: 100, height: 50 },
							{ src: "/b.svg", width: 100, height: 60 },
						],
						"Sonata",
						{ priority: true },
					),
				).toBe(
					"<ol data-lilypond-group>" +
						'<li><img data-lilypond-image src="/a.svg" width="100" height="50" alt="Sonata" loading="eager" decoding="sync" fetchpriority="high"></li>' +
						'<li><img data-lilypond-image src="/b.svg" width="100" height="60" alt="Sonata" loading="eager" decoding="sync" fetchpriority="high"></li>' +
						"</ol>",
				);
			});

			it("lets an explicit hint override the priority default for that attribute", () => {
				expect(
					renderedHtml(
						[{ src: "/a.svg", width: undefined, height: undefined }],
						"",
						{ priority: true, loading: "lazy", fetchpriority: "low" },
					),
				).toBe(
					'<img data-lilypond-image src="/a.svg" alt loading="lazy" decoding="sync" fetchpriority="low">',
				);
			});

			it("adds nothing when priority is false and no hints are given", () => {
				expect(
					renderedHtml(
						[{ src: "/a.svg", width: undefined, height: undefined }],
						"",
						{ priority: false },
					),
				).toBe('<img data-lilypond-image src="/a.svg" alt>');
			});
		});
	});
});
