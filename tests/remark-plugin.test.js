import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/render.js", () => ({
	render: vi.fn(),
}));

import { render } from "../src/render.js";
import { remarkLilypondPlugin } from "../src/remark-plugin.js";

const FAKE_SVG = "<svg xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";
const RENDERED_SVG = "<svg class=\"lilypond\" xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";

beforeEach(() => {
	vi.clearAllMocks();
	render.mockResolvedValue(Buffer.from(FAKE_SVG));
});

function makeTree(nodes) {
	return { type: "root", children: nodes };
}

async function runPlugin(tree) {
	const plugin = remarkLilypondPlugin();
	await plugin(tree, { path: "test.md" });
	return tree;
}

describe("remarkLilypondPlugin", () => {
	it("returns a transformer function", () => {
		const transformer = remarkLilypondPlugin();
		expect(typeof transformer).toBe("function");
	});

	it("transforms a lilypond code block to an html node with inline SVG", async () => {
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" },
		]);

		await runPlugin(tree);

		expect(render).toHaveBeenCalledWith("\\score { }", { format: "svg", resolution: undefined });
		expect(tree.children[0]).toEqual({ type: "html", value: RENDERED_SVG });
	});

	it("leaves non-lilypond code blocks untouched", async () => {
		const jsNode = { type: "code", lang: "js", value: "const x = 1" };
		const tree = makeTree([jsNode]);

		await runPlugin(tree);

		expect(render).not.toHaveBeenCalled();
		expect(tree.children[0]).toBe(jsNode);
	});

	it("accepts 'ly' as an alternative language marker", async () => {
		const tree = makeTree([
			{ type: "code", lang: "ly", value: "\\score { }" },
		]);

		await runPlugin(tree);

		expect(render).toHaveBeenCalledWith("\\score { }", { format: "svg", resolution: undefined });
		expect(tree.children[0]).toEqual({ type: "html", value: RENDERED_SVG });
	});

	it("handles multiple lilypond blocks in one document", async () => {
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { c }" },
			{ type: "paragraph", children: [{ type: "text", value: "hello" }] },
			{ type: "code", lang: "lilypond", value: "\\score { d }" },
		]);

		await runPlugin(tree);

		expect(render).toHaveBeenCalledTimes(2);
		expect(tree.children[0].type).toBe("html");
		expect(tree.children[2].type).toBe("html");
		expect(tree.children[1].type).toBe("paragraph");
	});

	it("replaces a failing block with a styled error node", async () => {
		render.mockRejectedValue(new Error("lilypond crashed"));
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "bad" },
		]);

		await runPlugin(tree);

		expect(tree.children[0].type).toBe("html");
		expect(tree.children[0].value).toContain("lilypond-error");
		expect(tree.children[0].value).toContain("lilypond crashed");
	});

	it("escapes error message HTML to prevent XSS", async () => {
		render.mockRejectedValue(new Error('<img src=x onerror="alert(1)">'));
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "bad" },
		]);

		await runPlugin(tree);

		expect(tree.children[0].value).not.toContain("<img");
		expect(tree.children[0].value).toContain("&lt;img");
	});

	it("prepends \\version when the version option is set", async () => {
		const plugin = remarkLilypondPlugin({ version: "2.24.0" });
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" },
		]);

		await plugin(tree, { path: "test.md" });

		expect(render).toHaveBeenCalledWith(
			'\\version "2.24.0"\n\\score { }',
			{ format: "svg", resolution: undefined },
		);
	});

	it("does not prepend \\version when the block already declares it", async () => {
		const plugin = remarkLilypondPlugin({ version: "2.24.0" });
		const value = '\\version "2.22.0"\n\\score { }';
		const tree = makeTree([{ type: "code", lang: "lilypond", value }]);

		await plugin(tree, { path: "test.md" });

		expect(render).toHaveBeenCalledWith(value, { format: "svg", resolution: undefined });
	});

	it("uses svg format by default", async () => {
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" },
		]);

		await runPlugin(tree);

		expect(render).toHaveBeenCalledWith("\\score { }", { format: "svg", resolution: undefined });
		expect(tree.children[0].value).toBe(RENDERED_SVG);
	});

	it("wraps png output in an img data URI", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		render.mockResolvedValue(fakePng);
		const plugin = remarkLilypondPlugin({ format: "png" });
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" },
		]);

		await plugin(tree, { path: "test.md" });

		expect(render).toHaveBeenCalledWith("\\score { }", { format: "png", resolution: undefined });
		expect(tree.children[0].value).toContain('<img class="lilypond" src="data:image/png;base64,');
	});

	it("passes resolution DPI when format is an object", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		render.mockResolvedValue(fakePng);
		const plugin = remarkLilypondPlugin({ format: { type: "png", resolution: 300 } });
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" },
		]);

		await plugin(tree, { path: "test.md" });

		expect(render).toHaveBeenCalledWith("\\score { }", { format: "png", resolution: 300 });
		expect(tree.children[0].value).toContain('<img class="lilypond" src="data:image/png;base64,');
	});

});
