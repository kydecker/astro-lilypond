import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/render", () => ({
	render: vi.fn(),
	defaultOptions: { format: "svg", resolution: 144, binaryPath: "lilypond", crop: true },
}));

import { render } from "../../src/render";
import { rehypeLilypondPlugin } from "../../src/rehype-plugin";

const mockRender = vi.mocked(render);

const FAKE_SVG = "<svg xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";
const RENDERED_SVG = `<img class="lilypond" src="data:image/svg+xml;base64,${Buffer.from(
	FAKE_SVG,
).toString("base64")}" alt="">`;

beforeEach(() => {
	vi.clearAllMocks();
	mockRender.mockResolvedValue(Buffer.from(FAKE_SVG));
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

async function runPlugin(tree: HastRoot): Promise<HastRoot> {
	const transformer = rehypeLilypondPlugin();
	await transformer(tree);
	return tree;
}

describe("rehypeLilypondPlugin", () => {
	it("returns a transformer function", () => {
		expect(typeof rehypeLilypondPlugin()).toBe("function");
	});

	it("transforms <pre><code.language-lilypond> to a raw img node", async () => {
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await runPlugin(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			resolution: undefined,
			crop: undefined,
			includePaths: [],
		});
		expect(tree.children[0]).toEqual({ type: "raw", value: RENDERED_SVG });
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
		expect(tree.children[0]).toEqual({ type: "raw", value: RENDERED_SVG });
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
		expect(tree.children[0]).toEqual({ type: "raw", value: RENDERED_SVG });
	});

	it("leaves non-lilypond <pre><code> untouched", async () => {
		const pre = makeOtherPre("js", "const x = 1");
		const tree = makeTree([pre]);

		await runPlugin(tree);

		expect(mockRender).not.toHaveBeenCalled();
		expect(tree.children[0]).toBe(pre);
	});

	it("propagates the error when a block fails to render", async () => {
		mockRender.mockRejectedValue(new Error("bad lilypond"));
		const tree = makeTree([makeLilypondPre("invalid")]);

		await expect(runPlugin(tree)).rejects.toThrow("bad lilypond");
	});

	it("prepends \\version when the version option is set", async () => {
		const transformer = rehypeLilypondPlugin({ version: "2.24.0" });
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await transformer(tree);

		expect(mockRender).toHaveBeenCalledWith('\\version "2.24.0"\n\\score { }', {
			format: "svg",
			resolution: undefined,
			crop: undefined,
			includePaths: [],
		});
	});

	it("does not prepend \\version when the block already declares it", async () => {
		const transformer = rehypeLilypondPlugin({ version: "2.24.0" });
		const value = '\\version "2.22.0"\n\\score { }';
		const tree = makeTree([makeLilypondPre(value)]);

		await transformer(tree);

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

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			resolution: undefined,
			crop: undefined,
			includePaths: [],
		});
		expect((tree.children[0] as HastRaw).value).toBe(RENDERED_SVG);
	});

	it("wraps png output in an img data URI", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue(fakePng);
		const transformer = rehypeLilypondPlugin({ format: "png" });
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await transformer(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "png",
			resolution: undefined,
			crop: undefined,
			includePaths: [],
		});
		expect((tree.children[0] as HastRaw).value).toContain(
			'<img class="lilypond" src="data:image/png;base64,',
		);
	});

	it("passes resolution DPI when resolution is set", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue(fakePng);
		const transformer = rehypeLilypondPlugin({
			format: "png",
			resolution: 300,
		});
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await transformer(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "png",
			resolution: 300,
			crop: undefined,
			includePaths: [],
		});
		expect((tree.children[0] as HastRaw).value).toContain(
			'<img class="lilypond" src="data:image/png;base64,',
		);
	});

	it("passes crop: false to render when the crop option is set to false", async () => {
		const transformer = rehypeLilypondPlugin({ crop: false });
		const tree = makeTree([makeLilypondPre("\\score { }")]);

		await transformer(tree);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			resolution: undefined,
			crop: false,
			includePaths: [],
		});
	});
});
