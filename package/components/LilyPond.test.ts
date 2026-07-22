import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import LilyPond from "./LilyPond.astro";

describe("LilyPond.astro", () => {
	it("renders the given content", async () => {
		const container = await AstroContainer.create();
		const result = await container.renderToString(LilyPond, {
			props: { content: '<svg class="lilypond"></svg>' },
		});
		expect(result).toContain('<svg class="lilypond">');
	});

	it("appends a custom class to the lilypond class", async () => {
		const container = await AstroContainer.create();
		const result = await container.renderToString(LilyPond, {
			props: { content: '<svg class="lilypond"></svg>', class: "extra" },
		});
		expect(result).toContain('class="lilypond extra"');
	});

	it("applies a style attribute to the svg element", async () => {
		const container = await AstroContainer.create();
		const result = await container.renderToString(LilyPond, {
			props: {
				content: '<svg class="lilypond"></svg>',
				style: "max-width: 100%",
			},
		});
		expect(result).toContain('<svg style="max-width: 100%"');
	});

	it("applies a style attribute to an img element", async () => {
		const container = await AstroContainer.create();
		const result = await container.renderToString(LilyPond, {
			props: {
				content: '<img class="lilypond" src="data:image/png;base64,">',
				style: "width: 50%",
			},
		});
		expect(result).toContain('<img style="width: 50%"');
	});

	it("renders content pointing at src file", async () => {
		const container = await AstroContainer.create();
		const result = await container.renderToString(LilyPond, {
			props: {
				content:
					'<img class="lilypond" src="/_lilypond/abc123.bach-bwv610.svg" alt="">',
				class: "extra",
				style: "width: 50%",
			},
		});
		expect(result).toContain('src="/_lilypond/abc123.bach-bwv610.svg"');
		expect(result).toContain('class="lilypond extra"');
		expect(result).toContain('<img style="width: 50%"');
	});

	it("escapes HTML-significant characters in the style attribute", async () => {
		const container = await AstroContainer.create();
		const result = await container.renderToString(LilyPond, {
			props: {
				content: '<svg class="lilypond"></svg>',
				style: '"><script>alert(1)</script>',
			},
		});
		expect(result).not.toContain("<script>alert(1)</script>");
		expect(result).toContain("&lt;script&gt;");
	});

	it("applies class and style to the <ol> wrapper of multi-page content", async () => {
		const container = await AstroContainer.create();
		const result = await container.renderToString(LilyPond, {
			props: {
				content:
					'<ol class="lilypond-pages">' +
					'<li><img class="lilypond" src="/_lilypond/a.svg" alt=""></li>' +
					'<li><img class="lilypond" src="/_lilypond/a-p2.svg" alt=""></li>' +
					"</ol>",
				class: "extra",
				style: "width: 50%",
			},
		});
		const olTag = result.match(/<ol[^>]*>/)?.[0] ?? "";
		expect(olTag).toContain('class="lilypond-pages extra"');
		expect(olTag).toContain('style="width: 50%"');
		expect(result.match(/class="lilypond extra"/g)).toBeNull();
		expect(result.match(/<img[^>]*style="width: 50%"/g)).toBeNull();
		expect(result.match(/class="lilypond"/g)).toHaveLength(2);
	});
});
