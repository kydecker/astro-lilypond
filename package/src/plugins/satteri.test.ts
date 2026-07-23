import type { Code, Html } from "mdast";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../render.js", () => ({
	render: vi.fn(),
	FORMATS: ["png", "svg"],
	resolveCrop: (cropSetting: unknown, context: "markdown" | "component") =>
		context === "markdown" ? cropSetting !== false : cropSetting === true,
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

import { render } from "../render.js";
import { writeAssets } from "../writeAsset.js";
import { type SatteriPluginOptions, satteriPlugin } from "./satteri.js";

const mockRender = vi.mocked(render);
const mockWriteAssets = vi.mocked(writeAssets);

const FAKE_SVG = "<svg xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";

const BASE_OPTIONS: SatteriPluginOptions = {
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

describe("satteriPlugin", () => {
	it("returns a plugin object with a name and code function", () => {
		const plugin = satteriPlugin(BASE_OPTIONS);
		expect(plugin.name).toBe("astro-lilypond");
		expect(typeof plugin.code).toBe("function");
	});

	it("transforms a lilypond code node to an html node with an img tag pointing at the written asset", async () => {
		const plugin = satteriPlugin(BASE_OPTIONS);
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		const result = await plugin.code?.(node, {} as never);

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
		const html = result as Html;
		expect(html.type).toBe("html");
		expect(html.value).toMatch(
			/^<img data-lilypond-image src="\/_lilypond\/[0-9a-f]+\.score\.svg" alt="">$/,
		);
	});

	it("returns undefined for non-lilypond code nodes", async () => {
		const plugin = satteriPlugin(BASE_OPTIONS);
		const node: Code = { type: "code", lang: "js", value: "console.log(1)" };

		const result = await plugin.code?.(node, {} as never);

		expect(mockRender).not.toHaveBeenCalled();
		expect(mockWriteAssets).not.toHaveBeenCalled();
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

		expect((result as Html).value).toMatch(
			/src="\/_lilypond\/[0-9a-f]+\.score\.svg"/,
		);
	});

	it("passes format: png through to render and writeAsset", async () => {
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
		expect((result as Html).value).toMatch(
			/^<img data-lilypond-image src="\/_lilypond\/[0-9a-f]+\.score\.png" alt="">$/,
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
	});

	it("renders cropped by default (defaults.crop unset)", async () => {
		const plugin = satteriPlugin(BASE_OPTIONS);
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		await plugin.code?.(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith(
			"\\score { }",
			expect.objectContaining({ crop: true }),
		);
	});

	it("follows defaults.crop when configured — markdown fences have no per-block override", async () => {
		const plugin = satteriPlugin({
			...BASE_OPTIONS,
			defaults: { crop: false },
		});
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		await plugin.code?.(node, {} as never);

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
			const plugin = satteriPlugin({ ...BASE_OPTIONS, pruneStaleAssets });
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

			const html = result as Html;
			expect(html.type).toBe("html");
			expect(html.value).toMatch(/^<ol data-lilypond-group>/);
			expect(html.value.match(/<li>/g)).toHaveLength(2);

			expect(pruneStaleAssets).toHaveBeenCalledTimes(1);
			const [, fileNames] = pruneStaleAssets.mock.calls[0] as [
				string,
				string[],
			];
			expect(fileNames).toHaveLength(2);
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

			expect((result as Html).value).toContain('alt="Sonata, by Beethoven"');
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

			expect((result as Html).value).toContain('alt="Custom"');
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

			expect((result as Html).value).toContain('alt=""');
		});

		it("leaves alt empty when there's neither a header nor a meta override", async () => {
			const plugin = satteriPlugin(BASE_OPTIONS);
			const node: Code = {
				type: "code",
				lang: "lilypond",
				value: "\\score { }",
			};

			const result = await plugin.code?.(node, {} as never);

			expect((result as Html).value).toContain('alt=""');
		});
	});

	describe("pruning stale assets", () => {
		it("prunes keyed by fileURL and the block's position among siblings", async () => {
			const pruneStaleAssets = vi.fn();
			const plugin = satteriPlugin({ ...BASE_OPTIONS, pruneStaleAssets });
			const node: Code = {
				type: "code",
				lang: "lilypond",
				value: "\\score { }",
			};
			const ctx = {
				fileURL: new URL("file:///project/docs/syntax.md"),
				indexOf: vi.fn().mockReturnValue(2),
			};

			await plugin.code?.(node, ctx as never);

			expect(pruneStaleAssets).toHaveBeenCalledTimes(1);
			const [sourceKey, fileNames] = pruneStaleAssets.mock.calls[0] as [
				string,
				string[],
			];
			expect(sourceKey).toBe("file:///project/docs/syntax.md#2");
			expect(fileNames).toHaveLength(1);
			expect(fileNames[0]).toMatch(/^[0-9a-f]+\.syntax\.svg$/);
		});

		it("skips pruning when fileURL is unavailable", async () => {
			const pruneStaleAssets = vi.fn();
			const plugin = satteriPlugin({ ...BASE_OPTIONS, pruneStaleAssets });
			const node: Code = {
				type: "code",
				lang: "lilypond",
				value: "\\score { }",
			};

			await plugin.code?.(node, {} as never);

			expect(pruneStaleAssets).not.toHaveBeenCalled();
		});
	});
});
