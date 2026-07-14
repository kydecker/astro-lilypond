import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/render.js", () => ({
	render: vi.fn(),
}));

import { render } from "../src/render.js";
import { rehypeLilypondPlugin } from "../src/rehype-plugin.js";

const FAKE_SVG = "<svg xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";
const RENDERED_SVG = "<svg class=\"lilypond\" xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";

beforeEach(() => {
	vi.clearAllMocks();
	render.mockResolvedValue(Buffer.from(FAKE_SVG));
});

function makeLilypondPre(code) {
	return {
		type: "element",
		tagName: "pre",
		properties: {},
		children: [
			{
				type: "element",
				tagName: "code",
				properties: { className: ["language-lilypond"] },
				children: [{ type: "text", value: code }],
			},
		],
	};
}

function makeOtherPre(lang, code) {
	return {
		type: "element",
		tagName: "pre",
		properties: {},
		children: [
			{
				type: "element",
				tagName: "code",
				properties: { className: [`language-${lang}`] },
				children: [{ type: "text", value: code }],
			},
		],
	};
}

function makeTree(children) {
	return { type: "root", children };
}

async function runPlugin(tree) {
	const transformer = rehypeLilypondPlugin();
	await transformer(tree, { path: "test.html" });
	return tree;
}

describe("rehypeLilypondPlugin", () => {
	it("returns a transformer function", () => {
		expect(typeof rehypeLilypondPlugin()).toBe("function");
	});

	it("transforms <pre><code.language-lilypond> to a raw SVG node", async () => {
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree);

		expect(render).toHaveBeenCalledWith("\\score { }", { format: "svg", resolution: undefined });
		expect(tree.children[0]).toEqual({ type: "raw", value: RENDERED_SVG });
	});

	it("accepts 'ly' as an alternative language marker", async () => {
		const pre = makeOtherPre("ly", "\\score { }");
		const tree = makeTree([pre]);

		await runPlugin(tree);

		expect(render).toHaveBeenCalledWith("\\score { }", { format: "svg", resolution: undefined });
		expect(tree.children[0]).toEqual({ type: "raw", value: RENDERED_SVG });
	});

	it("leaves non-lilypond <pre><code> untouched", async () => {
		const pre = makeOtherPre("js", "const x = 1");
		const tree = makeTree([pre]);

		await runPlugin(tree);

		expect(render).not.toHaveBeenCalled();
		expect(tree.children[0]).toBe(pre);
	});

	it("replaces a failing block with a styled error node", async () => {
		render.mockRejectedValue(new Error("bad lilypond"));
		const tree = makeTree([makeLilypondPre("invalid")]);

		await runPlugin(tree);

		expect(tree.children[0].type).toBe("raw");
		expect(tree.children[0].value).toContain("lilypond-error");
		expect(tree.children[0].value).toContain("bad lilypond");
	});

	it("escapes error message HTML to prevent XSS", async () => {
		render.mockRejectedValue(new Error('<script>evil()</script>'));
		const tree = makeTree([makeLilypondPre("invalid")]);

		await runPlugin(tree);

		expect(tree.children[0].value).not.toContain("<script>");
		expect(tree.children[0].value).toContain("&lt;script&gt;");
	});

	it("prepends \\version when the version option is set", async () => {
		const transformer = rehypeLilypondPlugin({ version: "2.24.0" });
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await transformer(tree, { path: "test.html" });

		expect(render).toHaveBeenCalledWith(
			'\\version "2.24.0"\n\\score { }',
			{ format: "svg", resolution: undefined },
		);
	});

	it("does not prepend \\version when the block already declares it", async () => {
		const transformer = rehypeLilypondPlugin({ version: "2.24.0" });
		const value = '\\version "2.22.0"\n\\score { }';
		const tree = makeTree([makeLilypondPre(value)]);

		await transformer(tree, { path: "test.html" });

		expect(render).toHaveBeenCalledWith(value, { format: "svg", resolution: undefined });
	});

	it("uses svg format by default", async () => {
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree);

		expect(render).toHaveBeenCalledWith("\\score { }", { format: "svg", resolution: undefined });
		expect(tree.children[0].value).toBe(RENDERED_SVG);
	});

	it("wraps png output in an img data URI", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		render.mockResolvedValue(fakePng);
		const transformer = rehypeLilypondPlugin({ format: "png" });
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await transformer(tree, { path: "test.html" });

		expect(render).toHaveBeenCalledWith("\\score { }", { format: "png", resolution: undefined });
		expect(tree.children[0].value).toContain('<img class="lilypond" src="data:image/png;base64,');
	});

	it("passes resolution DPI when format is an object", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		render.mockResolvedValue(fakePng);
		const transformer = rehypeLilypondPlugin({ format: { type: "png", resolution: 300 } });
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await transformer(tree, { path: "test.html" });

		expect(render).toHaveBeenCalledWith("\\score { }", { format: "png", resolution: 300 });
		expect(tree.children[0].value).toContain('<img class="lilypond" src="data:image/png;base64,');
	});

});
