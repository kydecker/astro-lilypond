import type { Code, Html, Paragraph, Root, Text } from "mdast";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../render", () => ({
	render: vi.fn(),
	FORMATS: ["png", "svg"],
	defaultOptions: {
		format: "svg",
		binaryPath: "lilypond",
		timeout: 60_000,
		defaults: {
			resolution: 144,
			crop: true,
			staffSize: 20,
			paperSize: "a4",
		},
	},
}));

vi.mock("../writeAsset.js", () => ({
	writeAsset: vi.fn(),
}));

import { render } from "../render";
import { writeAsset } from "../writeAsset.js";
import {
	remarkPlugin as _remarkLilypondPlugin,
	type RemarkPluginOptions,
} from "./remark.js";

const mockRender = vi.mocked(render);
const mockWriteAsset = vi.mocked(writeAsset);

const FAKE_SVG = "<svg xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";

const BASE_OPTIONS: RemarkPluginOptions = {
	assetsDir: "/project/public/_lilypond",
	assetsUrlBase: "/_lilypond",
	trackAsset: vi.fn(),
	pruneStaleAssets: vi.fn(),
};

type SimpleTransformer = (tree: Root, file: { path: string }) => Promise<void>;
type SimplePlugin = (opts: RemarkPluginOptions) => SimpleTransformer;
const remarkLilypondPlugin = _remarkLilypondPlugin as unknown as SimplePlugin;

beforeEach(() => {
	vi.clearAllMocks();
	mockRender.mockResolvedValue(Buffer.from(FAKE_SVG));

	// Simulate a cache miss; invoke the render function
	mockWriteAsset.mockImplementation(async (opts) => {
		await opts.getBuffer();
		return `/_lilypond/mock-hash.${opts.title}.${opts.format}`;
	});
});

function makeTree(nodes: Root["children"]): Root {
	return { type: "root", children: nodes };
}

async function runPlugin(
	tree: Root,
	options: RemarkPluginOptions = BASE_OPTIONS,
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

	it("transforms a lilypond code block to an html node with an img tag pointing at the written asset", async () => {
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			defaults: undefined,
			includePaths: ["."],
			sourceName: "test.md",
		});
		expect(mockWriteAsset).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "test",
				format: "svg",
				outputDir: BASE_OPTIONS.assetsDir,
				urlBase: BASE_OPTIONS.assetsUrlBase,
				trackAsset: BASE_OPTIONS.trackAsset,
			}),
		);
		expect(tree.children[0]).toEqual({
			type: "html",
			value:
				'<img class="lilypond" src="/_lilypond/mock-hash.test.svg" alt="">',
		});
	});

	it("leaves non-lilypond code blocks untouched", async () => {
		const jsNode: Code = { type: "code", lang: "js", value: "const x = 1" };
		const tree = makeTree([jsNode]);

		await runPlugin(tree);

		expect(mockRender).not.toHaveBeenCalled();
		expect(mockWriteAsset).not.toHaveBeenCalled();
		expect(tree.children[0]).toBe(jsNode);
	});

	it("accepts 'ly' as an alternative language marker", async () => {
		const tree = makeTree([
			{ type: "code", lang: "ly", value: "\\score { }" } as Code,
		]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
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
		mockRender.mockRejectedValue(new Error("lilypond crashed"));
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "bad" } as Code,
		]);

		await expect(runPlugin(tree)).rejects.toThrow("lilypond crashed");
	});

	it("prepends \\version when the version option is set", async () => {
		const options = { ...BASE_OPTIONS, defaults: { version: "2.24.0" } };
		const plugin = remarkLilypondPlugin(
			options,
		) as unknown as SimpleTransformer;
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await plugin(tree, { path: "test.md" });

		expect(mockRender).toHaveBeenCalledWith('\\version "2.24.0"\n\\score { }', {
			format: "svg",
			defaults: { version: "2.24.0" },
			includePaths: ["."],
			sourceName: "test.md",
		});
	});

	it("does not prepend \\version when the block already declares it", async () => {
		const options = { ...BASE_OPTIONS, defaults: { version: "2.24.0" } };
		const plugin = remarkLilypondPlugin(
			options,
		) as unknown as SimpleTransformer;
		const value = '\\version "2.22.0"\n\\score { }';
		const tree = makeTree([{ type: "code", lang: "lilypond", value } as Code]);

		await plugin(tree, { path: "test.md" });

		expect(mockRender).toHaveBeenCalledWith(value, {
			format: "svg",
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
			'src="/_lilypond/mock-hash.test.svg"',
		);
	});

	it("passes format: png through to render and writeAsset", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue(fakePng);
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
			defaults: undefined,
			includePaths: ["."],
			sourceName: "test.md",
		});
		expect((tree.children[0] as Html).value).toBe(
			'<img class="lilypond" src="/_lilypond/mock-hash.test.png" alt="">',
		);
	});

	it("passes resolution DPI when resolution is set", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue(fakePng);
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
			defaults: { resolution: 300 },
			includePaths: ["."],
			sourceName: "test.md",
		});
	});

	it("passes crop: false to render when the crop option is set to false", async () => {
		const options = { ...BASE_OPTIONS, defaults: { crop: false } };
		const plugin = remarkLilypondPlugin(
			options,
		) as unknown as SimpleTransformer;
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await plugin(tree, { path: "test.md" });

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			defaults: { crop: false },
			includePaths: ["."],
			sourceName: "test.md",
		});
	});

	describe("pruning stale assets", () => {
		it("prunes with file.path and every filename produced this pass", async () => {
			const pruneStaleAssets = vi.fn();
			const options = { ...BASE_OPTIONS, pruneStaleAssets };
			const plugin = remarkLilypondPlugin(
				options,
			) as unknown as SimpleTransformer;
			const tree = makeTree([
				{ type: "code", lang: "lilypond", value: "\\score { c }" } as Code,
				{ type: "code", lang: "lilypond", value: "\\score { d }" } as Code,
			]);

			await plugin(tree, { path: "syntax.md" });

			expect(pruneStaleAssets).toHaveBeenCalledTimes(1);
			const [sourceKey, fileNames] = pruneStaleAssets.mock.calls[0] as [
				string,
				string[],
			];
			expect(sourceKey).toBe("syntax.md");
			expect(fileNames).toHaveLength(2);
			for (const fileName of fileNames) {
				expect(fileName).toMatch(/^[0-9a-f]+\.syntax\.svg$/);
			}
			// Two distinct blocks hash to two distinct filenames.
			expect(fileNames[0]).not.toBe(fileNames[1]);
		});

		it("skips pruning when file.path is unavailable", async () => {
			const pruneStaleAssets = vi.fn();
			const options = { ...BASE_OPTIONS, pruneStaleAssets };
			const plugin = remarkLilypondPlugin(
				options,
			) as unknown as SimpleTransformer;
			const tree = makeTree([
				{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
			]);

			await plugin(tree, { path: undefined } as unknown as { path: string });

			expect(pruneStaleAssets).not.toHaveBeenCalled();
		});
	});
});
