import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Code, Html, Paragraph, Root, Text } from "mdast";

vi.mock("../../src/render", () => ({
	render: vi.fn(),
	defaultOptions: { format: "svg", resolution: 144, binaryPath: "lilypond", crop: true },
}));

import { render } from "../../src/render";
import {
	remarkLilypondPlugin as _remarkLilypondPlugin,
	type RemarkPluginOptions,
} from "../../src/remark-plugin.js";

const mockRender = vi.mocked(render);

const FAKE_SVG = "<svg xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";
const RENDERED_SVG = `<img class="lilypond" src="data:image/svg+xml;base64,${Buffer.from(
	FAKE_SVG,
).toString("base64")}" alt="">`;

type SimpleTransformer = (tree: Root, file: { path: string }) => Promise<void>;
type SimplePlugin = (opts?: RemarkPluginOptions) => SimpleTransformer;
const remarkLilypondPlugin = _remarkLilypondPlugin as unknown as SimplePlugin;

beforeEach(() => {
	vi.clearAllMocks();
	mockRender.mockResolvedValue(Buffer.from(FAKE_SVG));
});

function makeTree(nodes: Root["children"]): Root {
	return { type: "root", children: nodes };
}

async function runPlugin(tree: Root): Promise<Root> {
	const plugin = remarkLilypondPlugin() as unknown as SimpleTransformer;
	await plugin(tree, { path: "test.md" });
	return tree;
}

describe("remarkLilypondPlugin", () => {
	it("returns a transformer function", () => {
		const transformer = remarkLilypondPlugin();
		expect(typeof transformer).toBe("function");
	});

	it("transforms a lilypond code block to an html node with an svg img tag", async () => {
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			resolution: undefined,
			crop: undefined,
			includePaths: ["."],
			sourceName: "test.md",
		});
		expect(tree.children[0]).toEqual({ type: "html", value: RENDERED_SVG });
	});

	it("leaves non-lilypond code blocks untouched", async () => {
		const jsNode: Code = { type: "code", lang: "js", value: "const x = 1" };
		const tree = makeTree([jsNode]);

		await runPlugin(tree);

		expect(mockRender).not.toHaveBeenCalled();
		expect(tree.children[0]).toBe(jsNode);
	});

	it("accepts 'ly' as an alternative language marker", async () => {
		const tree = makeTree([
			{ type: "code", lang: "ly", value: "\\score { }" } as Code,
		]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			resolution: undefined,
			crop: undefined,
			includePaths: ["."],
			sourceName: "test.md",
		});
		expect(tree.children[0]).toEqual({ type: "html", value: RENDERED_SVG });
	});

	it("accepts 'ily' as an alternative language marker", async () => {
		const tree = makeTree([
			{ type: "code", lang: "ily", value: "\\score { }" } as Code,
		]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			resolution: undefined,
			crop: undefined,
			includePaths: ["."],
			sourceName: "test.md",
		});
		expect(tree.children[0]).toEqual({ type: "html", value: RENDERED_SVG });
	});

	it("handles multiple lilypond blocks in one document", async () => {
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { c }" } as Code,
			{
				type: "paragraph",
				children: [{ type: "text", value: "hello" } as Text],
			} as Paragraph,
			{ type: "code", lang: "lilypond", value: "\\score { d }" } as Code,
		]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledTimes(2);
		expect(tree.children[0].type).toBe("html");
		expect(tree.children[2].type).toBe("html");
		expect(tree.children[1].type).toBe("paragraph");
	});

	it("propagates the error when a block fails to render", async () => {
		mockRender.mockRejectedValue(new Error("lilypond crashed"));
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "bad" } as Code,
		]);

		await expect(runPlugin(tree)).rejects.toThrow("lilypond crashed");
	});

	it("prepends \\version when the version option is set", async () => {
		const plugin = remarkLilypondPlugin({ version: "2.24.0" }) as unknown as SimpleTransformer;
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await plugin(tree, { path: "test.md" });

		expect(mockRender).toHaveBeenCalledWith('\\version "2.24.0"\n\\score { }', {
			format: "svg",
			resolution: undefined,
			crop: undefined,
			includePaths: ["."],
			sourceName: "test.md",
		});
	});

	it("does not prepend \\version when the block already declares it", async () => {
		const plugin = remarkLilypondPlugin({ version: "2.24.0" }) as unknown as SimpleTransformer;
		const value = '\\version "2.22.0"\n\\score { }';
		const tree = makeTree([{ type: "code", lang: "lilypond", value } as Code]);

		await plugin(tree, { path: "test.md" });

		expect(mockRender).toHaveBeenCalledWith(value, {
			format: "svg",
			resolution: undefined,
			crop: undefined,
			includePaths: ["."],
			sourceName: "test.md",
		});
	});

	it("uses svg format by default", async () => {
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			resolution: undefined,
			crop: undefined,
			includePaths: ["."],
			sourceName: "test.md",
		});
		expect((tree.children[0] as Html).value).toBe(RENDERED_SVG);
	});

	it("wraps png output in an img data URI", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue(fakePng);
		const plugin = remarkLilypondPlugin({ format: "png" }) as unknown as SimpleTransformer;
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await plugin(tree, { path: "test.md" });

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "png",
			resolution: undefined,
			crop: undefined,
			includePaths: ["."],
			sourceName: "test.md",
		});
		expect((tree.children[0] as Html).value).toContain(
			'<img class="lilypond" src="data:image/png;base64,',
		);
	});

	it("passes resolution DPI when resolution is set", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue(fakePng);
		const plugin = remarkLilypondPlugin({
			format: "png",
			resolution: 300,
		}) as unknown as SimpleTransformer;
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await plugin(tree, { path: "test.md" });

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "png",
			resolution: 300,
			crop: undefined,
			includePaths: ["."],
			sourceName: "test.md",
		});
		expect((tree.children[0] as Html).value).toContain(
			'<img class="lilypond" src="data:image/png;base64,',
		);
	});

	it("passes crop: false to render when the crop option is set to false", async () => {
		const plugin = remarkLilypondPlugin({ crop: false }) as unknown as SimpleTransformer;
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await plugin(tree, { path: "test.md" });

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			resolution: undefined,
			crop: false,
			includePaths: ["."],
			sourceName: "test.md",
		});
	});
});
