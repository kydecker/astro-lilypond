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
import { rehypePlugin } from "../rehype.js";

const mockRender = vi.mocked(render);
const mockEmitLilypondAsset = vi.mocked(emitLilypondAsset);

const FAKE_SVG = "<svg xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";

const BASE_OPTIONS: PluginOptions = {};

beforeEach(() => {
	vi.clearAllMocks();
	mockRender.mockResolvedValue([Buffer.from(FAKE_SVG)]);
	fakeEmitLilypondAsset(mockEmitLilypondAsset, "/_lilypond");
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
	data?: { meta?: string };
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

function makeLilypondPre(code: string, meta?: string): HastElement {
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
				...(meta !== undefined ? { data: { meta } } : {}),
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
	options: PluginOptions = BASE_OPTIONS,
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

	it("transforms <pre><code.language-lilypond> to a raw img node pointing at the emitted asset", async () => {
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			crop: true,
			defaults: undefined,
			includePaths: [],
		});
		expect(mockEmitLilypondAsset).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "score",
				format: "svg",
				source: "\\score { }",
				crop: true,
			}),
		);
		const raw = tree.children[0] as HastRaw;
		expect(raw.type).toBe("raw");
		expect(raw.value).toBe(
			'<img data-lilypond-image src="/_lilypond/score.svg" alt>',
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
		expect(mockEmitLilypondAsset).not.toHaveBeenCalled();
		expect(tree.children[0]).toBe(pre);
	});

	it("leaves a <pre><code> with no className untouched", async () => {
		const pre: HastElement = {
			type: "element",
			tagName: "pre",
			properties: {},
			children: [
				{
					type: "element",
					tagName: "code",
					properties: {},
					children: [{ type: "text", value: "const x = 1" }],
				},
			],
		};
		const tree = makeTree([pre]);

		await runPlugin(tree);

		expect(mockRender).not.toHaveBeenCalled();
		expect(mockEmitLilypondAsset).not.toHaveBeenCalled();
		expect(tree.children[0]).toBe(pre);
	});

	it("propagates the error when a block fails to render", async () => {
		fakeEmitLilypondAssetPropagatingRenderErrors(mockEmitLilypondAsset);
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

		expect((tree.children[0] as HastRaw).value).toContain(
			'src="/_lilypond/score.svg"',
		);
	});

	it("passes format: png through to render and emitLilypondAsset", async () => {
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
		expect((tree.children[0] as HastRaw).value).toBe(
			'<img data-lilypond-image src="/_lilypond/score.png" alt>',
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
		expect(mockEmitLilypondAsset).toHaveBeenCalledWith(
			expect.objectContaining({ resolution: 300 }),
		);
	});

	it("always renders markdown fences cropped, with no way to opt out via defaults", async () => {
		const tree = makeTree([makeLilypondPre("\\score { }")]);

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
			]);
			const tree = makeTree([makeLilypondPre("\\score { }")]);

			await runPlugin(tree, BASE_OPTIONS, { path: "test.md" });

			const raw = tree.children[0] as HastRaw;
			expect(raw.type).toBe("raw");
			expect(raw.value).toMatch(/^<ol data-lilypond-group>/);
			expect(raw.value.match(/<li>/g)).toHaveLength(2);
		});
	});

	describe("alt text", () => {
		it("derives alt text from \\header title/composer when there's no meta override", async () => {
			const tree = makeTree([
				makeLilypondPre('\\header { title = "Sonata" composer = "Beethoven" }'),
			]);

			await runPlugin(tree);

			expect((tree.children[0] as HastRaw).value).toContain(
				'alt="Sonata, by Beethoven"',
			);
		});

		it("prefers a meta alt= override (read from codeNode.data.meta) over \\header-derived alt text", async () => {
			const tree = makeTree([
				makeLilypondPre('\\header { title = "Sonata" }', 'alt="Custom"'),
			]);

			await runPlugin(tree);

			expect((tree.children[0] as HastRaw).value).toContain('alt="Custom"');
		});

		it('an explicit meta alt="" forces decorative alt even when a header is present', async () => {
			const tree = makeTree([
				makeLilypondPre('\\header { title = "Sonata" }', 'alt=""'),
			]);

			await runPlugin(tree);

			expect((tree.children[0] as HastRaw).value).toContain(" alt>");
		});

		it("leaves alt empty when there's neither a header nor a meta override", async () => {
			const tree = makeTree([makeLilypondPre("\\score { }")]);

			await runPlugin(tree);

			expect((tree.children[0] as HastRaw).value).toContain(" alt>");
		});
	});
});
