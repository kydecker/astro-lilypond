import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../render", () => ({
	render: vi.fn(),
	FORMATS: ["png", "svg"],
	defaultOptions: {
		format: "svg",
		resolution: 144,
		binaryPath: "lilypond",
		crop: true,
	},
}));

vi.mock("../writeAsset.js", () => ({
	writeAsset: vi.fn(),
}));

import { render } from "../render";
import { writeAsset } from "../writeAsset.js";
import { type RehypePluginOptions, rehypePlugin } from "./rehype.js";

const mockRender = vi.mocked(render);
const mockWriteAsset = vi.mocked(writeAsset);

const FAKE_SVG = "<svg xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";

const BASE_OPTIONS: RehypePluginOptions = {
	assetsDir: "/project/public/_lilypond",
	assetsUrlBase: "/_lilypond",
	trackAsset: vi.fn(),
};

beforeEach(() => {
	vi.clearAllMocks();
	mockRender.mockResolvedValue(Buffer.from(FAKE_SVG));
	mockWriteAsset.mockImplementation(async (opts) => {
		await opts.getBuffer();
		return `/_lilypond/mock-hash.${opts.title}.${opts.format}`;
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
): Promise<HastRoot> {
	const transformer = rehypePlugin(options);
	await transformer(tree);
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
			resolution: undefined,
			crop: undefined,
			includePaths: [],
		});
		expect(mockWriteAsset).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "score",
				format: "svg",
				outputDir: BASE_OPTIONS.assetsDir,
				urlBase: BASE_OPTIONS.assetsUrlBase,
				trackAsset: BASE_OPTIONS.trackAsset,
			}),
		);
		expect(tree.children[0]).toEqual({
			type: "raw",
			value:
				'<img class="lilypond" src="/_lilypond/mock-hash.score.svg" alt="">',
		});
	});

	it("accepts 'ly' as an alternative language marker", async () => {
		const tree = makeTree([makeOtherPre("ly", "\\score { }")]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			resolution: undefined,
			crop: undefined,
			includePaths: [],
		});
	});

	it("accepts 'ily' as an alternative language marker", async () => {
		const tree = makeTree([makeOtherPre("ily", "\\score { }")]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			resolution: undefined,
			crop: undefined,
			includePaths: [],
		});
	});

	it("leaves non-lilypond <pre><code> untouched", async () => {
		const pre = makeOtherPre("js", "const x = 1");
		const tree = makeTree([pre]);

		await runPlugin(tree);

		expect(mockRender).not.toHaveBeenCalled();
		expect(mockWriteAsset).not.toHaveBeenCalled();
		expect(tree.children[0]).toBe(pre);
	});

	it("propagates the error when a block fails to render", async () => {
		mockRender.mockRejectedValue(new Error("bad lilypond"));
		const tree = makeTree([makeLilypondPre("invalid")]);

		await expect(runPlugin(tree)).rejects.toThrow("bad lilypond");
	});

	it("prepends \\version when the version option is set", async () => {
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree, { ...BASE_OPTIONS, version: "2.24.0" });

		expect(mockRender).toHaveBeenCalledWith('\\version "2.24.0"\n\\score { }', {
			format: "svg",
			resolution: undefined,
			crop: undefined,
			includePaths: [],
		});
	});

	it("does not prepend \\version when the block already declares it", async () => {
		const value = '\\version "2.22.0"\n\\score { }';
		const tree = makeTree([makeLilypondPre(value)]);

		await runPlugin(tree, { ...BASE_OPTIONS, version: "2.24.0" });

		expect(mockRender).toHaveBeenCalledWith(value, {
			format: "svg",
			resolution: undefined,
			crop: undefined,
			includePaths: [],
		});
	});

	it("uses svg format by default", async () => {
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree);

		expect((tree.children[0] as HastRaw).value).toContain(
			'src="/_lilypond/mock-hash.score.svg"',
		);
	});

	it("passes format: png through to render and writeAsset", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue(fakePng);
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree, { ...BASE_OPTIONS, format: "png" });

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "png",
			resolution: undefined,
			crop: undefined,
			includePaths: [],
		});
		expect((tree.children[0] as HastRaw).value).toBe(
			'<img class="lilypond" src="/_lilypond/mock-hash.score.png" alt="">',
		);
	});

	it("passes resolution DPI when resolution is set", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue(fakePng);
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree, { ...BASE_OPTIONS, format: "png", resolution: 300 });

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "png",
			resolution: 300,
			crop: undefined,
			includePaths: [],
		});
	});

	it("passes crop: false to render when the crop option is set to false", async () => {
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree, { ...BASE_OPTIONS, crop: false });

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			resolution: undefined,
			crop: false,
			includePaths: [],
		});
	});
});
