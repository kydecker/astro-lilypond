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
			format: "svg",
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

const FAKE_LOGGER = { warn: vi.fn(), error: vi.fn() };

const BASE_OPTIONS: PluginOptions = { logger: FAKE_LOGGER };

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

	it("throws an error when the lilypond() integration hasn't run", () => {
		expect(() =>
			remarkLilypondPlugin({ ...BASE_OPTIONS, logger: undefined }),
		).toThrow(/lilypond\(\).*Astro config/s);
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
			logger: FAKE_LOGGER,
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

	it("appends the integration's configured includePaths after the file's own directory", async () => {
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "\\score { }" } as Code,
		]);

		await runPlugin(tree, {
			...BASE_OPTIONS,
			includePaths: ["/snippets"],
		});

		expect(mockRender).toHaveBeenCalledWith(
			"\\score { }",
			expect.objectContaining({ includePaths: [".", "/snippets"] }),
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
			logger: FAKE_LOGGER,
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
			logger: FAKE_LOGGER,
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

	it("still throws when a block fails to render and dev is explicitly false", async () => {
		fakeEmitLilypondAssetPropagatingRenderErrors(mockEmitLilypondAsset);
		mockRender.mockRejectedValue(new Error("lilypond crashed"));
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "bad" } as Code,
		]);

		await expect(
			runPlugin(tree, { ...BASE_OPTIONS, isDev: false }),
		).rejects.toThrow("lilypond crashed");
	});

	it("renders an inline error block instead of throwing when dev is true", async () => {
		fakeEmitLilypondAssetPropagatingRenderErrors(mockEmitLilypondAsset);
		mockRender.mockRejectedValue(new Error("fatal error: bad input"));
		const tree = makeTree([
			{ type: "code", lang: "lilypond", value: "bad" } as Code,
		]);

		await runPlugin(tree, { ...BASE_OPTIONS, isDev: true });

		const html = tree.children[0] as Html;
		expect(html.type).toBe("html");
		expect(html.value).toContain("fatal error: bad input");
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
			logger: FAKE_LOGGER,
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
			logger: FAKE_LOGGER,
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

	it("passes defaults.format: png through to render and emitLilypondAsset", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue([fakePng]);
		const options = { ...BASE_OPTIONS, defaults: { format: "png" as const } };
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
			defaults: { format: "png" },
			includePaths: ["."],
			sourceName: "test.md",
			logger: FAKE_LOGGER,
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
			defaults: { format: "png" as const, resolution: 300 },
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
			defaults: { format: "png", resolution: 300 },
			includePaths: ["."],
			sourceName: "test.md",
			logger: FAKE_LOGGER,
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

	describe("image loading hints from fence meta", () => {
		it("forwards loading onto the rendered <img>", async () => {
			const tree = makeTree([
				{
					type: "code",
					lang: "lilypond",
					meta: 'loading="lazy"',
					value: "\\score { }",
				} as Code,
			]);

			await runPlugin(tree);

			expect((tree.children[0] as Html).value).toBe(
				'<img data-lilypond-image src="/_lilypond/test.svg" alt loading="lazy">',
			);
		});

		it("keeps loading/decoding/fetchpriority alongside an alt override", async () => {
			const tree = makeTree([
				{
					type: "code",
					lang: "lilypond",
					meta: 'alt="Sonata" loading="eager" decoding="async" fetchpriority="high"',
					value: "\\score { }",
				} as Code,
			]);

			await runPlugin(tree);

			expect((tree.children[0] as Html).value).toBe(
				'<img data-lilypond-image src="/_lilypond/test.svg" alt="Sonata" loading="eager" decoding="async" fetchpriority="high">',
			);
		});

		it('priority="true" sets loading=eager, decoding=sync, fetchpriority=high', async () => {
			const tree = makeTree([
				{
					type: "code",
					lang: "lilypond",
					meta: 'priority="true"',
					value: "\\score { }",
				} as Code,
			]);

			await runPlugin(tree);

			expect((tree.children[0] as Html).value).toBe(
				'<img data-lilypond-image src="/_lilypond/test.svg" alt loading="eager" decoding="sync" fetchpriority="high">',
			);
		});

		it('lets an explicit hint override priority="true" for that attribute', async () => {
			const tree = makeTree([
				{
					type: "code",
					lang: "lilypond",
					meta: 'priority="true" loading="lazy"',
					value: "\\score { }",
				} as Code,
			]);

			await runPlugin(tree);

			expect((tree.children[0] as Html).value).toContain(
				'alt loading="lazy" decoding="sync" fetchpriority="high"',
			);
		});

		it("applies the same hints to every <img> in a multi-page group", async () => {
			mockRender.mockResolvedValue([
				Buffer.from("page1"),
				Buffer.from("page2"),
			]);
			const tree = makeTree([
				{
					type: "code",
					lang: "lilypond",
					meta: 'priority="true"',
					value: "\\score { }",
				} as Code,
			]);

			await runPlugin(tree);

			const html = (tree.children[0] as Html).value;
			expect(html.match(/loading="eager"/g)).toHaveLength(2);
			expect(html.match(/decoding="sync"/g)).toHaveLength(2);
			expect(html.match(/fetchpriority="high"/g)).toHaveLength(2);
		});

		it("ignores an unrecognised meta value and renders the default img", async () => {
			const tree = makeTree([
				{
					type: "code",
					lang: "lilypond",
					meta: 'loading="garbage"',
					value: "\\score { }",
				} as Code,
			]);

			await runPlugin(tree);

			expect((tree.children[0] as Html).value).toBe(
				'<img data-lilypond-image src="/_lilypond/test.svg" alt>',
			);
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
