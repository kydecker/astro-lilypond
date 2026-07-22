import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../render", () => ({
	render: vi.fn(),
	FORMATS: ["png", "svg"],
	defaultOptions: {
		format: "svg",
		crop: true,
		binaryPath: "lilypond",
		timeout: 60_000,
		defaults: {
			resolution: 144,
			crop: "markdown-only",
		},
	},
}));

vi.mock("../writeAsset.js", () => ({
	writeAssets: vi.fn(),
}));

import { render } from "../render";
import { writeAssets } from "../writeAsset.js";
import { type RehypePluginOptions, rehypePlugin } from "./rehype.js";

const mockRender = vi.mocked(render);
const mockWriteAssets = vi.mocked(writeAssets);

const FAKE_SVG = "<svg xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";

const BASE_OPTIONS: RehypePluginOptions = {
	assetsDir: "/project/public/_lilypond",
	assetsUrlBase: "/_lilypond",
	trackAsset: vi.fn(),
	pruneStaleAssets: vi.fn(),
};

beforeEach(() => {
	vi.clearAllMocks();
	mockRender.mockResolvedValue([Buffer.from(FAKE_SVG)]);
	// Uses the real `opts.hash` (computed by the plugin from the block's
	// content) so filename assertions can still check the real hash format.
	mockWriteAssets.mockImplementation(async (opts) => {
		const buffers = await opts.getBuffers();
		return buffers.map((_, i) => {
			const fileName =
				i === 0
					? `${opts.hash}.${opts.title}.${opts.format}`
					: `${opts.hash}.${opts.title}-p${i + 1}.${opts.format}`;
			return { fileName, url: `/_lilypond/${fileName}` };
		});
	});
});

interface HastText {
	type: "text";
	value: string;
}

interface HastElement {
	type: "element";
	tagName: string;
	properties: Record<string, unknown>;
	children: (HastElement | HastText)[];
}

interface HastRaw {
	type: "raw";
	value: string;
}

type HastChild = HastElement | HastRaw;

interface HastRoot {
	type: "root";
	children: HastChild[];
}

function makeLilypondPre(code: string): HastElement {
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

function makeOtherPre(lang: string, code: string): HastElement {
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

function makeTree(children: HastChild[]): HastRoot {
	return { type: "root", children };
}

async function runPlugin(
	tree: HastRoot,
	options: RehypePluginOptions = BASE_OPTIONS,
	file?: { path?: string },
): Promise<HastRoot> {
	const transformer = rehypePlugin(options);
	await transformer(tree, file);
	return tree;
}

describe("rehypePlugin", () => {
	it("returns a transformer function", () => {
		expect(typeof rehypePlugin(BASE_OPTIONS)).toBe("function");
	});

	it("transforms <pre><code.language-lilypond> to a raw img node pointing at the written asset", async () => {
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			crop: true,
			defaults: undefined,
			includePaths: [],
		});
		expect(mockWriteAssets).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "score",
				format: "svg",
				outputDir: BASE_OPTIONS.assetsDir,
				urlBase: BASE_OPTIONS.assetsUrlBase,
				trackAsset: BASE_OPTIONS.trackAsset,
			}),
		);
		const raw = tree.children[0] as HastRaw;
		expect(raw.type).toBe("raw");
		expect(raw.value).toMatch(
			/^<img class="lilypond" src="\/_lilypond\/[0-9a-f]+\.score\.svg" alt="">$/,
		);
	});

	it("accepts 'ly' as an alternative language marker", async () => {
		const tree = makeTree([makeOtherPre("ly", "\\score { }")]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			crop: true,
			defaults: undefined,
			includePaths: [],
		});
	});

	it("accepts 'ily' as an alternative language marker", async () => {
		const tree = makeTree([makeOtherPre("ily", "\\score { }")]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			crop: true,
			defaults: undefined,
			includePaths: [],
		});
	});

	it("leaves non-lilypond <pre><code> untouched", async () => {
		const pre = makeOtherPre("js", "const x = 1");
		const tree = makeTree([pre]);

		await runPlugin(tree);

		expect(mockRender).not.toHaveBeenCalled();
		expect(mockWriteAssets).not.toHaveBeenCalled();
		expect(tree.children[0]).toBe(pre);
	});

	it("propagates the error when a block fails to render", async () => {
		mockRender.mockRejectedValue(new Error("bad lilypond"));
		const tree = makeTree([makeLilypondPre("invalid")]);

		await expect(runPlugin(tree)).rejects.toThrow("bad lilypond");
	});

	it("prepends \\version when the version option is set", async () => {
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree, {
			...BASE_OPTIONS,
			defaults: { version: "2.24.0" },
		});

		expect(mockRender).toHaveBeenCalledWith('\\version "2.24.0"\n\\score { }', {
			format: "svg",
			crop: true,
			defaults: { version: "2.24.0" },
			includePaths: [],
		});
	});

	it("does not prepend \\version when the block already declares it", async () => {
		const value = '\\version "2.22.0"\n\\score { }';
		const tree = makeTree([makeLilypondPre(value)]);

		await runPlugin(tree, { ...BASE_OPTIONS, defaults: { version: "2.24.0" } });

		expect(mockRender).toHaveBeenCalledWith(value, {
			format: "svg",
			crop: true,
			defaults: { version: "2.24.0" },
			includePaths: [],
		});
	});

	it("uses svg format by default", async () => {
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree);

		expect((tree.children[0] as HastRaw).value).toMatch(
			/src="\/_lilypond\/[0-9a-f]+\.score\.svg"/,
		);
	});

	it("passes format: png through to render and writeAsset", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue([fakePng]);
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree, { ...BASE_OPTIONS, format: "png" });

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "png",
			crop: true,
			defaults: undefined,
			includePaths: [],
		});
		expect((tree.children[0] as HastRaw).value).toMatch(
			/^<img class="lilypond" src="\/_lilypond\/[0-9a-f]+\.score\.png" alt="">$/,
		);
	});

	it("passes resolution DPI when resolution is set", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue([fakePng]);
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree, {
			...BASE_OPTIONS,
			format: "png",
			defaults: { resolution: 300 },
		});

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "png",
			crop: true,
			defaults: { resolution: 300 },
			includePaths: [],
		});
	});

	it("renders cropped by default (defaults.crop unset)", async () => {
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith(
			"\\score { }",
			expect.objectContaining({ crop: true }),
		);
	});

	it("follows defaults.crop when configured — markdown fences have no per-block override", async () => {
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree, { ...BASE_OPTIONS, defaults: { crop: false } });

		expect(mockRender).toHaveBeenCalledWith(
			"\\score { }",
			expect.objectContaining({ crop: false }),
		);
	});

	describe("multi-page output", () => {
		it("wraps multiple pages in an <ol><li> and prunes every page's filename", async () => {
			mockRender.mockResolvedValue([
				Buffer.from("page1"),
				Buffer.from("page2"),
			]);
			const pruneStaleAssets = vi.fn();
			const tree = makeTree([makeLilypondPre("\\score { }")]);

			await runPlugin(
				tree,
				{ ...BASE_OPTIONS, pruneStaleAssets },
				{ path: "test.md" },
			);

			const raw = tree.children[0] as HastRaw;
			expect(raw.type).toBe("raw");
			expect(raw.value).toMatch(/^<ol class="lilypond-pages">/);
			expect(raw.value.match(/<li>/g)).toHaveLength(2);

			expect(pruneStaleAssets).toHaveBeenCalledTimes(1);
			const [, fileNames] = pruneStaleAssets.mock.calls[0] as [
				string,
				string[],
			];
			expect(fileNames).toHaveLength(2);
		});
	});

	describe("pruning stale assets", () => {
		it("prunes with file.path and every filename produced this pass", async () => {
			const pruneStaleAssets = vi.fn();
			const tree = makeTree([
				makeLilypondPre("\\score { c }"),
				makeLilypondPre("\\score { d }"),
			]);

			await runPlugin(
				tree,
				{ ...BASE_OPTIONS, pruneStaleAssets },
				{ path: "syntax.md" },
			);

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
			const tree = makeTree([makeLilypondPre("\\score { }")]);

			await runPlugin(tree, { ...BASE_OPTIONS, pruneStaleAssets });

			expect(pruneStaleAssets).not.toHaveBeenCalled();
		});
	});
});
