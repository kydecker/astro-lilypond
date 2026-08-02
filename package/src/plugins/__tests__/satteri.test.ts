import type { Code } from "mdast";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../render.js", () => ({
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
import { satteriPlugin } from "../satteri.js";

const mockRender = vi.mocked(render);
const mockEmitLilypondAsset = vi.mocked(emitLilypondAsset);

const FAKE_SVG = "<svg xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";

const BASE_OPTIONS: PluginOptions = {};

function rawHtml(result: unknown): string {
	return (result as { rawHtml: string }).rawHtml;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockRender.mockResolvedValue([Buffer.from(FAKE_SVG)]);
	fakeEmitLilypondAsset(mockEmitLilypondAsset, "/_lilypond");
});

describe("satteriPlugin", () => {
	it("returns a plugin object with a name and code function", () => {
		const plugin = satteriPlugin(BASE_OPTIONS);
		expect(plugin.name).toBe("astro-lilypond");
		expect(typeof plugin.code).toBe("function");
	});

	it("transforms a lilypond code node to { rawHtml } with an img tag pointing at the emitted asset", async () => {
		const plugin = satteriPlugin(BASE_OPTIONS);
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		const result = await plugin.code?.(node, {} as never);

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
		expect(rawHtml(result)).toBe(
			'<img data-lilypond-image src="/_lilypond/score.svg" alt>',
		);
	});

	// { rawHtml } re-parses as real HTML on both of Sätteri's compile targets:
	// a literal insert for plain Markdown, and structured JSX for MDX (where a
	// plain mdast `html` node would instead be escaped as text).
	it("returns { rawHtml } the same way regardless of ctx.sourceFormat", async () => {
		const plugin = satteriPlugin(BASE_OPTIONS);
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		const markdownResult = await plugin.code?.(node, {} as never);
		const mdxResult = await plugin.code?.(node, {
			sourceFormat: "mdx",
		} as never);

		expect(rawHtml(markdownResult)).toBe(rawHtml(mdxResult));
	});

	it("returns undefined for non-lilypond code nodes", async () => {
		const plugin = satteriPlugin(BASE_OPTIONS);
		const node: Code = { type: "code", lang: "js", value: "console.log(1)" };

		const result = await plugin.code?.(node, {} as never);

		expect(mockRender).not.toHaveBeenCalled();
		expect(mockEmitLilypondAsset).not.toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	it("accepts 'ly' as an alternative language marker", async () => {
		const plugin = satteriPlugin(BASE_OPTIONS);
		const node: Code = { type: "code", lang: "ly", value: "\\score { }" };

		await plugin.code?.(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			crop: true,
			defaults: undefined,
			includePaths: [],
		});
	});

	it("accepts 'ily' as an alternative language marker", async () => {
		const plugin = satteriPlugin(BASE_OPTIONS);
		const node: Code = { type: "code", lang: "ily", value: "\\score { }" };

		await plugin.code?.(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			crop: true,
			defaults: undefined,
			includePaths: [],
		});
	});

	it("propagates the error when render throws", async () => {
		fakeEmitLilypondAssetPropagatingRenderErrors(mockEmitLilypondAsset);
		mockRender.mockRejectedValue(new Error("bad syntax"));
		const plugin = satteriPlugin(BASE_OPTIONS);
		const node: Code = { type: "code", lang: "lilypond", value: "invalid" };

		await expect(plugin.code?.(node, {} as never)).rejects.toThrow(
			"bad syntax",
		);
	});

	it("prepends \\version when the version option is set", async () => {
		const plugin = satteriPlugin({
			...BASE_OPTIONS,
			defaults: { version: "2.24.0" },
		});
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		await plugin.code?.(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith('\\version "2.24.0"\n\\score { }', {
			format: "svg",
			crop: true,
			defaults: { version: "2.24.0" },
			includePaths: [],
		});
	});

	it("does not prepend \\version when the block already declares it", async () => {
		const plugin = satteriPlugin({
			...BASE_OPTIONS,
			defaults: { version: "2.24.0" },
		});
		const value = '\\version "2.22.0"\n\\score { }';
		const node: Code = { type: "code", lang: "lilypond", value };

		await plugin.code?.(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith(value, {
			format: "svg",
			crop: true,
			defaults: { version: "2.24.0" },
			includePaths: [],
		});
	});

	it("uses svg format by default", async () => {
		const plugin = satteriPlugin(BASE_OPTIONS);
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		const result = await plugin.code?.(node, {} as never);

		expect(rawHtml(result)).toContain('src="/_lilypond/score.svg"');
	});

	it("passes format: png through to render and emitLilypondAsset", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue([fakePng]);
		const plugin = satteriPlugin({ ...BASE_OPTIONS, format: "png" });
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		const result = await plugin.code?.(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "png",
			crop: true,
			defaults: undefined,
			includePaths: [],
		});
		expect(rawHtml(result)).toBe(
			'<img data-lilypond-image src="/_lilypond/score.png" alt>',
		);
	});

	it("passes resolution DPI when resolution is set", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue([fakePng]);
		const plugin = satteriPlugin({
			...BASE_OPTIONS,
			format: "png",
			defaults: { resolution: 300 },
		});
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		await plugin.code?.(node, {} as never);

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
		const plugin = satteriPlugin(BASE_OPTIONS);
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		await plugin.code?.(node, {} as never);

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
			const plugin = satteriPlugin(BASE_OPTIONS);
			const node: Code = {
				type: "code",
				lang: "lilypond",
				value: "\\score { }",
			};
			const ctx = {
				fileURL: new URL("file:///project/docs/syntax.md"),
				indexOf: vi.fn().mockReturnValue(0),
			};

			const result = await plugin.code?.(node, ctx as never);

			expect(rawHtml(result)).toMatch(/^<ol data-lilypond-group>/);
			expect(rawHtml(result).match(/<li>/g)).toHaveLength(2);
		});
	});

	describe("alt text", () => {
		it("derives alt text from \\header title/composer when there's no meta override", async () => {
			const plugin = satteriPlugin(BASE_OPTIONS);
			const node: Code = {
				type: "code",
				lang: "lilypond",
				value: '\\header { title = "Sonata" composer = "Beethoven" }',
			};

			const result = await plugin.code?.(node, {} as never);

			expect(rawHtml(result)).toContain('alt="Sonata, by Beethoven"');
		});

		it("prefers a meta alt= override over \\header-derived alt text", async () => {
			const plugin = satteriPlugin(BASE_OPTIONS);
			const node: Code = {
				type: "code",
				lang: "lilypond",
				meta: 'alt="Custom"',
				value: '\\header { title = "Sonata" }',
			};

			const result = await plugin.code?.(node, {} as never);

			expect(rawHtml(result)).toContain('alt="Custom"');
		});

		it('an explicit meta alt="" forces decorative alt even when a header is present', async () => {
			const plugin = satteriPlugin(BASE_OPTIONS);
			const node: Code = {
				type: "code",
				lang: "lilypond",
				meta: 'alt=""',
				value: '\\header { title = "Sonata" }',
			};

			const result = await plugin.code?.(node, {} as never);

			expect(rawHtml(result)).toContain(" alt>");
		});

		it("leaves alt empty when there's neither a header nor a meta override", async () => {
			const plugin = satteriPlugin(BASE_OPTIONS);
			const node: Code = {
				type: "code",
				lang: "lilypond",
				value: "\\score { }",
			};

			const result = await plugin.code?.(node, {} as never);

			expect(rawHtml(result)).toContain(" alt>");
		});

		it("keeps a literal brace in \\header-derived alt text intact", async () => {
			const plugin = satteriPlugin(BASE_OPTIONS);
			const node: Code = {
				type: "code",
				lang: "lilypond",
				value: '\\header { title = "Op. {1}" }',
			};

			const result = await plugin.code?.(node, {
				sourceFormat: "mdx",
			} as never);

			expect(rawHtml(result)).toContain('alt="Op. {1}"');
		});
	});

	describe("title derivation from ctx.fileURL", () => {
		it("derives the asset title from the source file's basename", async () => {
			const plugin = satteriPlugin(BASE_OPTIONS);
			const node: Code = {
				type: "code",
				lang: "lilypond",
				value: "\\score { }",
			};
			const ctx = {
				fileURL: new URL("file:///project/docs/syntax.md"),
				indexOf: vi.fn().mockReturnValue(0),
			};

			await plugin.code?.(node, ctx as never);

			expect(mockEmitLilypondAsset).toHaveBeenCalledWith(
				expect.objectContaining({ title: "syntax" }),
			);
		});
	});
});
