import type { Code, Html, Paragraph, Root, Text } from "mdast";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../render", () => ({
	render: vi.fn(),
	FORMATS: ["png", "svg"],
	defaultOptions: {
		format: "svg",
		crop: true,
		binaryPath: "lilypond",
		timeout: 60_000,
		defaults: {
			resolution: 144,
		},
	},
}));

vi.mock("../../utils/emitLilypondAsset.js", () => ({
	emitLilypondAsset: vi.fn(),
}));

import { render } from "../../render.js";
import {
	fakeEmitLilypondAsset,
	fakeEmitLilypondAssetPropagatingRenderErrors,
} from "../../utils/__tests__/emitLilypondAsset.fake.js";
import { emitLilypondAsset } from "../../utils/emitLilypondAsset.js";
import type { PluginOptions } from "../index.js";
import { remarkPlugin as _remarkLilypondPlugin } from "../remark.js";

const mockRender = vi.mocked(render);
const mockEmitLilypondAsset = vi.mocked(emitLilypondAsset);

const FAKE_SVG = "<svg xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";

const BASE_OPTIONS: PluginOptions = {};

type SimpleTransformer = (tree: Root, file: { path: string }) => Promise<void>;
type SimplePlugin = (opts: PluginOptions) => SimpleTransformer;
const remarkLilypondPlugin = _remarkLilypondPlugin as unknown as SimplePlugin;

beforeEach(() => {
	vi.clearAllMocks();
	mockRender.mockResolvedValue([Buffer.from(FAKE_SVG)]);
	fakeEmitLilypondAsset(mockEmitLilypondAsset, "/_lilypond");
});

function makeTree(nodes: Root["children"]): Root {
	return { type: "root", children: nodes };
}

async function runPlugin(
	tree: Root,
	options: PluginOptions = BASE_OPTIONS,
): Promise<Root> {
	const plugin = remarkLilypondPlugin(options) as unknown as SimpleTransformer;
	await plugin(tree, { path: "test.md" });
	return tree;
}

describe("remarkLilypondPlugin", () => {
	it("returns a transformer function", () => {
		const transformer = remarkLilypondPlugin(BASE_OPTIONS);
		expect(typeof transformer).toBe("function");
	});

	it("transforms a lilypond code block to an html node with an img tag pointing at the emitted asset", async () => {
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			crop: true,
			defaults: undefined,
			includePaths: ["."],
			sourceName: "test.md",
		});
		expect(mockEmitLilypondAsset).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "test",
				format: "svg",
				source: "\\score { }",
				crop: true,
			}),
		);
		const html = tree.children[0] as Html;
		expect(html.type).toBe("html");
		expect(html.value).toBe(
			'<img data-lilypond-image src="/_lilypond/test.svg" alt>',
		);
	});

	it("leaves non-lilypond code blocks untouched", async () => {
		const jsNode: Code = { type: "code", lang: "js", value: "const x = 1" };
		const tree = makeTree([jsNode]);

		await runPlugin(tree);

		expect(mockRender).not.toHaveBeenCalled();
		expect(mockEmitLilypondAsset).not.toHaveBeenCalled();
		expect(tree.children[0]).toBe(jsNode);
	});

	it("accepts 'ly' as an alternative language marker", async () => {
		const tree = makeTree([
			{ type: "code", lang: "ly", value: "\\score { }" } as Code,
		]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			crop: true,
			defaults: undefined,
			includePaths: ["."],
			sourceName: "test.md",
		});
	});

	it("accepts 'ily' as an alternative language marker", async () => {
		const tree = makeTree([
			{ type: "code", lang: "ily", value: "\\score { }" } as Code,
		]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			crop: true,
			defaults: undefined,
			includePaths: ["."],
			sourceName: "test.md",
		});
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
		fakeEmitLilypondAssetPropagatingRenderErrors(mockEmitLilypondAsset);
		mockRender.mockRejectedValue(new Error("lilypond crashed"));
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "bad" } as Code,
		]);

		await expect(runPlugin(tree)).rejects.toThrow("lilypond crashed");
	});

	it("prepends \\version when the version option is set", async () => {
		const options = {
			...BASE_OPTIONS,
			defaults: { version: "2.24.0" as const },
		};
		const plugin = remarkLilypondPlugin(
			options,
		) as unknown as SimpleTransformer;
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await plugin(tree, { path: "test.md" });

		expect(mockRender).toHaveBeenCalledWith('\\version "2.24.0"\n\\score { }', {
			format: "svg",
			crop: true,
			defaults: { version: "2.24.0" },
			includePaths: ["."],
			sourceName: "test.md",
		});
	});

	it("does not prepend \\version when the block already declares it", async () => {
		const options = {
			...BASE_OPTIONS,
			defaults: { version: "2.24.0" as const },
		};
		const plugin = remarkLilypondPlugin(
			options,
		) as unknown as SimpleTransformer;
		const value = '\\version "2.22.0"\n\\score { }';
		const tree = makeTree([{ type: "code", lang: "lilypond", value } as Code]);

		await plugin(tree, { path: "test.md" });

		expect(mockRender).toHaveBeenCalledWith(value, {
			format: "svg",
			crop: true,
			defaults: { version: "2.24.0" },
			includePaths: ["."],
			sourceName: "test.md",
		});
	});

	it("uses svg format by default", async () => {
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await runPlugin(tree);

		expect((tree.children[0] as Html).value).toContain(
			'src="/_lilypond/test.svg"',
		);
	});

	it("passes format: png through to render and emitLilypondAsset", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue([fakePng]);
		const options = { ...BASE_OPTIONS, format: "png" as const };
		const plugin = remarkLilypondPlugin(
			options,
		) as unknown as SimpleTransformer;
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await plugin(tree, { path: "test.md" });

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "png",
			crop: true,
			defaults: undefined,
			includePaths: ["."],
			sourceName: "test.md",
		});
		expect((tree.children[0] as Html).value).toBe(
			'<img data-lilypond-image src="/_lilypond/test.png" alt>',
		);
	});

	it("passes resolution DPI when resolution is set", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue([fakePng]);
		const options = {
			...BASE_OPTIONS,
			format: "png" as const,
			defaults: { resolution: 300 },
		};
		const plugin = remarkLilypondPlugin(
			options,
		) as unknown as SimpleTransformer;
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await plugin(tree, { path: "test.md" });

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "png",
			crop: true,
			defaults: { resolution: 300 },
			includePaths: ["."],
			sourceName: "test.md",
		});
		expect(mockEmitLilypondAsset).toHaveBeenCalledWith(
			expect.objectContaining({ resolution: 300 }),
		);
	});

	it("always renders markdown fences cropped, with no way to opt out via defaults", async () => {
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith(
			"\\score { }",
			expect.objectContaining({ crop: true }),
		);
	});

	describe("multi-page output", () => {
		it("wraps multiple pages in an <ol><li>, one per emitted page", async () => {
			mockRender.mockResolvedValue([
				Buffer.from("page1"),
				Buffer.from("page2"),
				Buffer.from("page3"),
			]);
			const tree = makeTree([
				{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
			]);

			await runPlugin(tree);

			const html = tree.children[0] as Html;
			expect(html.type).toBe("html");
			expect(html.value).toMatch(/^<ol data-lilypond-group>/);
			expect(html.value.match(/<li>/g)).toHaveLength(3);
			expect(html.value).toMatch(/\/test\.svg" alt>/);
			expect(html.value).toMatch(/\/test-p2\.svg" alt>/);
			expect(html.value).toMatch(/\/test-p3\.svg" alt>/);
		});
	});

	describe("alt text", () => {
		it("derives alt text from \\header title/composer when there's no meta override", async () => {
			const tree = makeTree([
				{
					type: "code",
					lang: "lilypond",
					value: '\\header { title = "Sonata" composer = "Beethoven" }',
				} as Code,
			]);

			await runPlugin(tree);

			expect((tree.children[0] as Html).value).toContain(
				'alt="Sonata, by Beethoven"',
			);
		});

		it("prefers a meta alt= override over \\header-derived alt text", async () => {
			const tree = makeTree([
				{
					type: "code",
					lang: "lilypond",
					meta: 'alt="Custom"',
					value: '\\header { title = "Sonata" }',
				} as Code,
			]);

			await runPlugin(tree);

			expect((tree.children[0] as Html).value).toContain('alt="Custom"');
		});

		it('an explicit meta alt="" forces decorative alt even when a header is present', async () => {
			const tree = makeTree([
				{
					type: "code",
					lang: "lilypond",
					meta: 'alt=""',
					value: '\\header { title = "Sonata" }',
				} as Code,
			]);

			await runPlugin(tree);

			expect((tree.children[0] as Html).value).toContain(" alt>");
		});

		it("leaves alt empty when there's neither a header nor a meta override", async () => {
			const tree = makeTree([
				{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
			]);

			await runPlugin(tree);

			expect((tree.children[0] as Html).value).toContain(" alt>");
		});

		it("applies the same header-derived alt text to every image in a group", async () => {
			mockRender.mockResolvedValue([
				Buffer.from("page1"),
				Buffer.from("page2"),
			]);
			const tree = makeTree([
				{
					type: "code",
					lang: "lilypond",
					value: '\\header { title = "Sonata" }',
				} as Code,
			]);

			await runPlugin(tree);

			const html = (tree.children[0] as Html).value;
			expect(html.match(/alt="Sonata"/g)).toHaveLength(2);
		});
	});
});
