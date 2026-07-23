import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import LilyPond from "./LilyPond.astro";

describe("LilyPond.astro", () => {
	it("renders a single page as a plain img", async () => {
		const container = await AstroContainer.create();
		const result = await container.renderToString(LilyPond, {
			props: { content: { srcs: ["/_lilypond/abc123.bach-bwv610.svg"] } },
		});
		expect(result).toContain('src="/_lilypond/abc123.bach-bwv610.svg"');
		expect(result).toContain("data-lilypond-image");
	});

	it("applies a custom class to the img", async () => {
		const container = await AstroContainer.create();
		const result = await container.renderToString(LilyPond, {
			props: { content: { srcs: ["/a.svg"] }, class: "extra" },
		});
		expect(result).toContain('class="extra"');
	});

	it("applies a style attribute to the img element", async () => {
		const container = await AstroContainer.create();
		const result = await container.renderToString(LilyPond, {
			props: { content: { srcs: ["/a.svg"] }, style: "width: 50%" },
		});
		expect(result).toContain('style="width: 50%"');
	});

	it("wraps multi-page content in an <ol><li> of img tags, in order", async () => {
		const container = await AstroContainer.create();
		const result = await container.renderToString(LilyPond, {
			props: {
				content: { srcs: ["/_lilypond/a.svg", "/_lilypond/a-p2.svg"] },
			},
		});
		expect(result).toContain("<ol data-lilypond-group");
		expect(result.match(/data-lilypond-image/g)).toHaveLength(2);
		expect(result).toContain('src="/_lilypond/a.svg"');
		expect(result).toContain('src="/_lilypond/a-p2.svg"');
	});

	it("applies class and style to the <ol> wrapper, not the individual pages", async () => {
		const container = await AstroContainer.create();
		const result = await container.renderToString(LilyPond, {
			props: {
				content: { srcs: ["/_lilypond/a.svg", "/_lilypond/a-p2.svg"] },
				class: "extra",
				style: "width: 50%",
			},
		});
		const olTag = result.match(/<ol[^>]*>/)?.[0] ?? "";
		expect(olTag).toContain('class="extra"');
		expect(olTag).toContain('style="width: 50%"');
		expect(result.match(/<img[^>]*class="extra"/g)).toBeNull();
		expect(result.match(/<img[^>]*style="width: 50%"/g)).toBeNull();
		expect(result.match(/data-lilypond-image/g)).toHaveLength(2);
	});
});
