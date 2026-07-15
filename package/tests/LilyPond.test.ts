import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, it, expect } from "vitest";
import LilyPond from "../components/LilyPond.astro";

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
			props: { content: '<svg class="lilypond"></svg>', style: "max-width: 100%" },
		});
		expect(result).toContain('<svg style="max-width: 100%"');
	});

	it("applies a style attribute to an img element", async () => {
		const container = await AstroContainer.create();
		const result = await container.renderToString(LilyPond, {
			props: { content: '<img class="lilypond" src="data:image/png;base64,">', style: "width: 50%" },
		});
		expect(result).toContain('<img style="width: 50%"');
	});

	it("escapes HTML-significant characters in the style attribute", async () => {
		const container = await AstroContainer.create();
		const result = await container.renderToString(LilyPond, {
			props: { content: '<svg class="lilypond"></svg>', style: '"><script>alert(1)</script>' },
		});
		expect(result).not.toContain("<script>alert(1)</script>");
		expect(result).toContain("&lt;script&gt;");
	});
});
