import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeAssets } from "./writeAsset.js";

let dir: string;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "astro-lilypond-write-asset-"));
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe("writeAssets", () => {
	it("writes a single page to <outputDir>/<hash>.<title>.<format> and returns its URL", async () => {
		const outputDir = join(dir, "_lilypond");
		const getBuffers = vi.fn().mockResolvedValue([Buffer.from("<svg></svg>")]);

		const assets = await writeAssets({
			hash: "abc123",
			title: "bach-bwv610",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffers,
		});

		expect(assets).toEqual([
			{
				fileName: "abc123.bach-bwv610.svg",
				url: "/_lilypond/abc123.bach-bwv610.svg",
			},
		]);
		expect(
			await readFile(join(outputDir, "abc123.bach-bwv610.svg"), "utf8"),
		).toBe("<svg></svg>");
	});

	it("writes one file per page, suffixing pages after the first with -pN", async () => {
		const outputDir = join(dir, "_lilypond");
		const getBuffers = vi
			.fn()
			.mockResolvedValue([
				Buffer.from("page one"),
				Buffer.from("page two"),
				Buffer.from("page three"),
			]);

		const assets = await writeAssets({
			hash: "abc123",
			title: "score",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffers,
		});

		expect(assets).toEqual([
			{ fileName: "abc123.score.svg", url: "/_lilypond/abc123.score.svg" },
			{
				fileName: "abc123.score-p2.svg",
				url: "/_lilypond/abc123.score-p2.svg",
			},
			{
				fileName: "abc123.score-p3.svg",
				url: "/_lilypond/abc123.score-p3.svg",
			},
		]);
		expect(await readFile(join(outputDir, "abc123.score.svg"), "utf8")).toBe(
			"page one",
		);
		expect(await readFile(join(outputDir, "abc123.score-p2.svg"), "utf8")).toBe(
			"page two",
		);
		expect(await readFile(join(outputDir, "abc123.score-p3.svg"), "utf8")).toBe(
			"page three",
		);
	});

	it("creates the output directory when it doesn't exist", async () => {
		const outputDir = join(dir, "nested", "_lilypond");
		await writeAssets({
			hash: "abc123",
			title: "score",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffers: vi.fn().mockResolvedValue([Buffer.from("<svg></svg>")]),
		});

		expect(await readdir(outputDir)).toContain("abc123.score.svg");
	});

	it("leaves no leftover temp files after a successful write", async () => {
		const outputDir = join(dir, "_lilypond");
		await writeAssets({
			hash: "abc123",
			title: "score",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffers: vi
				.fn()
				.mockResolvedValue([Buffer.from("a"), Buffer.from("b")]),
		});

		expect((await readdir(outputDir)).sort()).toEqual([
			"abc123.score-p2.svg",
			"abc123.score.svg",
		]);
	});

	it("skips calling getBuffers when page 1 already exists", async () => {
		const outputDir = join(dir, "_lilypond");
		const getBuffers = vi.fn().mockResolvedValue([Buffer.from("<svg></svg>")]);

		await writeAssets({
			hash: "abc123",
			title: "score",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffers,
		});
		expect(getBuffers).toHaveBeenCalledTimes(1);

		const assets = await writeAssets({
			hash: "abc123",
			title: "score",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffers,
		});

		expect(assets).toEqual([
			{ fileName: "abc123.score.svg", url: "/_lilypond/abc123.score.svg" },
		]);
		expect(getBuffers).toHaveBeenCalledTimes(1);
	});

	it("reconstructs the full page list from disk on a cache hit, without calling getBuffers", async () => {
		const outputDir = join(dir, "_lilypond");
		await writeAssets({
			hash: "abc123",
			title: "score",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffers: vi
				.fn()
				.mockResolvedValue([
					Buffer.from("a"),
					Buffer.from("b"),
					Buffer.from("c"),
				]),
		});

		const getBuffers = vi.fn();
		const assets = await writeAssets({
			hash: "abc123",
			title: "score",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffers,
		});

		expect(assets).toEqual([
			{ fileName: "abc123.score.svg", url: "/_lilypond/abc123.score.svg" },
			{
				fileName: "abc123.score-p2.svg",
				url: "/_lilypond/abc123.score-p2.svg",
			},
			{
				fileName: "abc123.score-p3.svg",
				url: "/_lilypond/abc123.score-p3.svg",
			},
		]);
		expect(getBuffers).not.toHaveBeenCalled();
	});

	it("calls trackAsset with every page's file name on a cache miss", async () => {
		const outputDir = join(dir, "_lilypond");
		const trackAsset = vi.fn();

		await writeAssets({
			hash: "abc123",
			title: "score",
			format: "png",
			outputDir,
			urlBase: "/_lilypond",
			trackAsset,
			getBuffers: vi
				.fn()
				.mockResolvedValue([
					Buffer.from([0x89, 0x50]),
					Buffer.from([0x89, 0x51]),
				]),
		});

		expect(trackAsset).toHaveBeenCalledWith("abc123.score.png");
		expect(trackAsset).toHaveBeenCalledWith("abc123.score-p2.png");
	});

	it("calls trackAsset with every page's file name on a cache hit", async () => {
		const outputDir = join(dir, "_lilypond");
		const getBuffers = vi
			.fn()
			.mockResolvedValue([Buffer.from("a"), Buffer.from("b")]);
		await writeAssets({
			hash: "abc123",
			title: "score",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffers,
		});

		const trackAsset = vi.fn();
		await writeAssets({
			hash: "abc123",
			title: "score",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			trackAsset,
			getBuffers,
		});

		expect(trackAsset).toHaveBeenCalledWith("abc123.score.svg");
		expect(trackAsset).toHaveBeenCalledWith("abc123.score-p2.svg");
	});

	it("uses the format as the file extension", async () => {
		const outputDir = join(dir, "_lilypond");
		const assets = await writeAssets({
			hash: "abc123",
			title: "score",
			format: "png",
			outputDir,
			urlBase: "/_lilypond",
			getBuffers: vi.fn().mockResolvedValue([Buffer.from([0x89, 0x50])]),
		});

		expect(assets[0].url).toBe("/_lilypond/abc123.score.png");
	});

	it("uses a different title for the same hash without colliding", async () => {
		const outputDir = join(dir, "_lilypond");
		const [assetA] = await writeAssets({
			hash: "abc123",
			title: "bach-bwv610",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffers: vi.fn().mockResolvedValue([Buffer.from("a")]),
		});
		const [assetB] = await writeAssets({
			hash: "abc123",
			title: "granados-goyescas",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffers: vi.fn().mockResolvedValue([Buffer.from("b")]),
		});

		expect(assetA.url).toBe("/_lilypond/abc123.bach-bwv610.svg");
		expect(assetB.url).toBe("/_lilypond/abc123.granados-goyescas.svg");
		expect((await readdir(outputDir)).sort()).toEqual([
			"abc123.bach-bwv610.svg",
			"abc123.granados-goyescas.svg",
		]);
	});

	describe("sizeScale", () => {
		const REAL_SVG =
			'<svg xmlns="http://www.w3.org/2000/svg" width="105" height="55" viewBox="0 0 105 55">content</svg>';

		it("multiplies the reported width/height without touching the written file", async () => {
			const outputDir = join(dir, "_lilypond");

			const assets = await writeAssets({
				hash: "abc123",
				title: "score",
				format: "svg",
				outputDir,
				urlBase: "/_lilypond",
				sizeScale: 1.5,
				getBuffers: vi.fn().mockResolvedValue([Buffer.from(REAL_SVG)]),
			});

			expect(assets[0].width).toBe(157.5);
			expect(assets[0].height).toBe(82.5);
			expect(await readFile(join(outputDir, "abc123.score.svg"), "utf8")).toBe(
				REAL_SVG,
			);
		});

		it("defaults to a scale of 1 when omitted", async () => {
			const outputDir = join(dir, "_lilypond");

			const assets = await writeAssets({
				hash: "abc123",
				title: "score",
				format: "svg",
				outputDir,
				urlBase: "/_lilypond",
				getBuffers: vi.fn().mockResolvedValue([Buffer.from(REAL_SVG)]),
			});

			expect(assets[0].width).toBe(105);
			expect(assets[0].height).toBe(55);
		});

		it("still applies on a cache hit, reading dimensions back from disk", async () => {
			const outputDir = join(dir, "_lilypond");
			const getBuffers = vi.fn().mockResolvedValue([Buffer.from(REAL_SVG)]);

			await writeAssets({
				hash: "abc123",
				title: "score",
				format: "svg",
				outputDir,
				urlBase: "/_lilypond",
				getBuffers,
			});

			const assets = await writeAssets({
				hash: "abc123",
				title: "score",
				format: "svg",
				outputDir,
				urlBase: "/_lilypond",
				sizeScale: 2,
				getBuffers,
			});

			expect(assets[0].width).toBe(210);
			expect(assets[0].height).toBe(110);
			expect(getBuffers).toHaveBeenCalledTimes(1);
		});
	});
});
