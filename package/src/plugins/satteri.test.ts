import type { Code, Html } from "mdast";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../render.js", () => ({
	render: vi.fn(),
	FORMATS: ["png", "svg"],
	defaultOptions: {
		format: "svg",
		binaryPath: "lilypond",
		timeout: 60_000,
		defaults: {
			resolution: 144,
			crop: true,
		},
	},
}));

vi.mock("../writeAsset.js", () => ({
	writeAsset: vi.fn(),
}));

import { render } from "../render.js";
import { writeAsset } from "../writeAsset.js";
import { type SatteriPluginOptions, satteriPlugin } from "./satteri.js";

const mockRender = vi.mocked(render);
const mockWriteAsset = vi.mocked(writeAsset);

const FAKE_SVG = "<svg xmlns='http://www.w3.org/2000/svg'><g>fake</g></svg>";

const BASE_OPTIONS: SatteriPluginOptions = {
	assetsDir: "/project/public/_lilypond",
	assetsUrlBase: "/_lilypond",
	trackAsset: vi.fn(),
	pruneStaleAssets: vi.fn(),
};

beforeEach(() => {
	vi.clearAllMocks();
	mockRender.mockResolvedValue(Buffer.from(FAKE_SVG));
	mockWriteAsset.mockImplementation(async (opts) => {
		await opts.getBuffer();
		return `/_lilypond/mock-hash.${opts.title}.${opts.format}`;
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
			defaults: undefined,
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
		expect(result).toEqual({
			type: "html",
			value:
				'<img class="lilypond" src="/_lilypond/mock-hash.score.svg" alt="">',
		});
	});

	it("returns undefined for non-lilypond code nodes", async () => {
		const plugin = satteriPlugin(BASE_OPTIONS);
		const node: Code = { type: "code", lang: "js", value: "console.log(1)" };

		const result = await plugin.code?.(node, {} as never);

		expect(mockRender).not.toHaveBeenCalled();
		expect(mockWriteAsset).not.toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	it("accepts 'ly' as an alternative language marker", async () => {
		const plugin = satteriPlugin(BASE_OPTIONS);
		const node: Code = { type: "code", lang: "ly", value: "\\score { }" };

		await plugin.code?.(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
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
			defaults: { version: "2.24.0" },
			includePaths: [],
		});
	});

	it("uses svg format by default", async () => {
		const plugin = satteriPlugin(BASE_OPTIONS);
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		const result = await plugin.code?.(node, {} as never);

		expect((result as Html).value).toContain(
			'src="/_lilypond/mock-hash.score.svg"',
		);
	});

	it("passes format: png through to render and writeAsset", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue(fakePng);
		const plugin = satteriPlugin({ ...BASE_OPTIONS, format: "png" });
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		const result = await plugin.code?.(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "png",
			defaults: undefined,
			includePaths: [],
		});
		expect((result as Html).value).toBe(
			'<img class="lilypond" src="/_lilypond/mock-hash.score.png" alt="">',
		);
	});

	it("passes resolution DPI when resolution is set", async () => {
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		mockRender.mockResolvedValue(fakePng);
		const plugin = satteriPlugin({
			...BASE_OPTIONS,
			format: "png",
			defaults: { resolution: 300 },
		});
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		await plugin.code?.(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "png",
			defaults: { resolution: 300 },
			includePaths: [],
		});
	});

	it("passes crop: false to render when the crop option is set to false", async () => {
		const plugin = satteriPlugin({
			...BASE_OPTIONS,
			defaults: { crop: false },
		});
		const node: Code = { type: "code", lang: "lilypond", value: "\\score { }" };

		await plugin.code?.(node, {} as never);

		expect(mockRender).toHaveBeenCalledWith("\\score { }", {
			format: "svg",
			defaults: { crop: false },
			includePaths: [],
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
