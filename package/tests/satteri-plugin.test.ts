import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Code, Html } from "mdast";

vi.mock("../src/render.js", () => ({
	render: vi.fn(),
}));

import { render } from "../src/render.js";
import { satteriLilypondPlugin } from "../src/satteri-plugin.js";

const mockRender = vi.mocked(render);

const FAKE_SVG = "<svg xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";
const RENDERED_SVG =
	"<svg class=\"lilypond\" xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";

beforeEach(() => {
	vi.clearAllMocks();
	mockRender.mockResolvedValue(Buffer.from(FAKE_SVG));
});

describe("satteriLilypondPlugin", () => {
	it("returns a plugin object with a name and code function", () => {
		const plugin = satteriLilypondPlugin();
		expect(plugin.name).toBe("astro-lilypond");
		expect(typeof plugin.code).toBe("function");
	});

	it("transforms a lilypond code node to an html node with inline SVG", async () => {
		const plugin = satteriLilypondPlugin();
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		const result = await plugin.code!(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			resolution: undefined,
		});
		expect(result).toEqual({ type: "html", value: RENDERED_SVG });
	});

	it("returns undefined for non-lilypond code nodes", async () => {
		const plugin = satteriLilypondPlugin();
		const node: Code = { type: "code", lang: "js", value: "console.log(1)" };

		const result = await plugin.code!(node, {} as never);

		expect(mockRender).not.toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	it("accepts 'ly' as an alternative language marker", async () => {
		const plugin = satteriLilypondPlugin();
		const node: Code = { type: "code", lang: "ly", value: "\\score { }" };

		const result = await plugin.code!(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			resolution: undefined,
		});
		expect(result).toEqual({ type: "html", value: RENDERED_SVG });
	});

	it("returns an error html node when render throws", async () => {
		mockRender.mockRejectedValue(new Error("bad syntax"));
		const plugin = satteriLilypondPlugin();
		const node: Code = { type: "code", lang: "lilypond", value: "invalid" };

		const result = await plugin.code!(node, {} as never);

		expect((result as Html).type).toBe("html");
		expect((result as Html).value).toContain("lilypond-error");
		expect((result as Html).value).toContain("bad syntax");
	});

	it("prepends \\version when the version option is set", async () => {
		const plugin = satteriLilypondPlugin({ version: "2.24.0" });
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		await plugin.code!(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith('\\version "2.24.0"\n\\score { }', {
			format: "svg",
			resolution: undefined,
		});
	});

	it("does not prepend \\version when the block already declares it", async () => {
		const plugin = satteriLilypondPlugin({ version: "2.24.0" });
		const value = '\\version "2.22.0"\n\\score { }';
		const node: Code = { type: "code", lang: "lilypond", value };

		await plugin.code!(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith(value, {
			format: "svg",
			resolution: undefined,
		});
	});

	it("uses svg format by default", async () => {
		const plugin = satteriLilypondPlugin();
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		const result = await plugin.code!(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			resolution: undefined,
		});
		expect((result as Html).value).toBe(RENDERED_SVG);
	});

	it("wraps png output in an img data URI", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue(fakePng);
		const plugin = satteriLilypondPlugin({ format: "png" });
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		const result = await plugin.code!(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "png",
			resolution: undefined,
		});
		expect((result as Html).value).toContain(
			'<img class="lilypond" src="data:image/png;base64,',
		);
		expect((result as Html).value).toContain(fakePng.toString("base64"));
	});

	it("passes resolution DPI when format is an object", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue(fakePng);
		const plugin = satteriLilypondPlugin({ format: { type: "png", resolution: 300 } });
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		const result = await plugin.code!(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "png",
			resolution: 300,
		});
		expect((result as Html).value).toContain(
			'<img class="lilypond" src="data:image/png;base64,',
		);
	});

	it("does not expose raw error message as HTML (XSS safe)", async () => {
		mockRender.mockRejectedValue(new Error("<script>alert(1)</script>"));
		const plugin = satteriLilypondPlugin();
		const node: Code = { type: "code", lang: "lilypond", value: "invalid" };

		const result = await plugin.code!(node, {} as never);

		expect((result as Html).value).not.toContain("<script>");
		expect((result as Html).value).toContain("&lt;script&gt;");
	});
});
