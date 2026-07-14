import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/render.js", () => ({
	render: vi.fn(),
}));

import { render } from "../src/render.js";
import { satteriLilypondPlugin } from "../src/satteri-plugin.js";

const FAKE_SVG = "<svg xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";
const RENDERED_SVG = "<svg class=\"lilypond\" xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";

beforeEach(() => {
	vi.clearAllMocks();
	render.mockResolvedValue(Buffer.from(FAKE_SVG));
});

describe("satteriLilypondPlugin", () => {
	it("returns a plugin object with a name and code function", () => {
		const plugin = satteriLilypondPlugin();
		expect(plugin.name).toBe("astro-lilypond");
		expect(typeof plugin.code).toBe("function");
	});

	it("transforms a lilypond code node to an html node with inline SVG", async () => {
		const plugin = satteriLilypondPlugin();
		const node = { type: "code", lang: "lilypond", value: "\\score { }" };

		const result = await plugin.code(node, {});

		expect(render).toHaveBeenCalledWith("\\score { }", { format: "svg", resolution: undefined });
		expect(result).toEqual({ type: "html", value: RENDERED_SVG });
	});

	it("returns undefined for non-lilypond code nodes", async () => {
		const plugin = satteriLilypondPlugin();
		const node = { type: "code", lang: "js", value: "console.log(1)" };

		const result = await plugin.code(node, {});

		expect(render).not.toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	it("accepts 'ly' as an alternative language marker", async () => {
		const plugin = satteriLilypondPlugin();
		const node = { type: "code", lang: "ly", value: "\\score { }" };

		const result = await plugin.code(node, {});

		expect(render).toHaveBeenCalledWith("\\score { }", { format: "svg", resolution: undefined });
		expect(result).toEqual({ type: "html", value: RENDERED_SVG });
	});

	it("returns an error html node when lilynode throws", async () => {
		render.mockRejectedValue(new Error("bad syntax"));
		const plugin = satteriLilypondPlugin();
		const node = { type: "code", lang: "lilypond", value: "invalid" };

		const result = await plugin.code(node, {});

		expect(result.type).toBe("html");
		expect(result.value).toContain("lilypond-error");
		expect(result.value).toContain("bad syntax");
	});

	it("prepends \\version when the version option is set", async () => {
		const plugin = satteriLilypondPlugin({ version: "2.24.0" });
		const node = { type: "code", lang: "lilypond", value: "\\score { }" };

		await plugin.code(node, {});

		expect(render).toHaveBeenCalledWith(
			'\\version "2.24.0"\n\\score { }',
			{ format: "svg", resolution: undefined },
		);
	});

	it("does not prepend \\version when the block already declares it", async () => {
		const plugin = satteriLilypondPlugin({ version: "2.24.0" });
		const value = '\\version "2.22.0"\n\\score { }';
		const node = { type: "code", lang: "lilypond", value };

		await plugin.code(node, {});

		expect(render).toHaveBeenCalledWith(value, { format: "svg", resolution: undefined });
	});

	it("uses svg format by default", async () => {
		const plugin = satteriLilypondPlugin();
		const node = { type: "code", lang: "lilypond", value: "\\score { }" };

		const result = await plugin.code(node, {});

		expect(render).toHaveBeenCalledWith("\\score { }", { format: "svg", resolution: undefined });
		expect(result.value).toBe(RENDERED_SVG);
	});

	it("wraps png output in an img data URI", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
		render.mockResolvedValue(fakePng);
		const plugin = satteriLilypondPlugin({ format: "png" });
		const node = { type: "code", lang: "lilypond", value: "\\score { }" };

		const result = await plugin.code(node, {});

		expect(render).toHaveBeenCalledWith("\\score { }", { format: "png", resolution: undefined });
		expect(result.value).toContain('<img class="lilypond" src="data:image/png;base64,');
		expect(result.value).toContain(fakePng.toString("base64"));
	});

	it("passes resolution DPI when format is an object", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		render.mockResolvedValue(fakePng);
		const plugin = satteriLilypondPlugin({ format: { type: "png", resolution: 300 } });
		const node = { type: "code", lang: "lilypond", value: "\\score { }" };

		const result = await plugin.code(node, {});

		expect(render).toHaveBeenCalledWith("\\score { }", { format: "png", resolution: 300 });
		expect(result.value).toContain('<img class="lilypond" src="data:image/png;base64,');
	});


	it("does not expose raw error message as HTML (XSS safe)", async () => {
		render.mockRejectedValue(new Error("<script>alert(1)</script>"));
		const plugin = satteriLilypondPlugin();
		const node = { type: "code", lang: "lilypond", value: "invalid" };

		const result = await plugin.code(node, {});

		expect(result.value).not.toContain("<script>");
		expect(result.value).toContain("&lt;script&gt;");
	});
});
