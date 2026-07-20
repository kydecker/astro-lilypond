import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pruneOrphanedAssets, pruneStaleAssets } from "./deleteAssets.js";

let dir: string;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "astro-lilypond-delete-assets-"));
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe("pruneOrphanedAssets", () => {
	it("deletes our own asset files that weren't referenced", async () => {
		await writeFile(join(dir, "aaaa.bach-bwv610.svg"), "kept");
		await writeFile(join(dir, "bbbb.bach-bwv610.svg"), "orphaned");

		await pruneOrphanedAssets({
			dir,
			referenced: new Set(["aaaa.bach-bwv610.svg"]),
		});

		expect(await readdir(dir)).toEqual(["aaaa.bach-bwv610.svg"]);
	});

	it("leaves files that don't match our own naming pattern untouched", async () => {
		await writeFile(join(dir, ".gitkeep"), "");
		await writeFile(join(dir, "readme.md"), "");
		await writeFile(join(dir, "aaaa.svg"), ""); // missing the <title> segment

		await pruneOrphanedAssets({ dir, referenced: new Set() });

		const remaining = (await readdir(dir)).sort();
		expect(remaining).toEqual([".gitkeep", "aaaa.svg", "readme.md"]);
	});

	it("is a no-op when the directory doesn't exist", async () => {
		await expect(
			pruneOrphanedAssets({
				dir: join(dir, "does-not-exist"),
				referenced: new Set(),
			}),
		).resolves.toBeUndefined();
	});

	it("logs a summary when files are pruned", async () => {
		await writeFile(join(dir, "aaaa.score.svg"), "orphaned");
		await writeFile(join(dir, "bbbb.score.png"), "orphaned");
		const logger = { info: vi.fn() };

		await pruneOrphanedAssets({ dir, referenced: new Set(), logger });

		expect(logger.info).toHaveBeenCalledWith(
			expect.stringContaining("pruned 2 orphaned assets"),
		);
	});

	it("logs a path relative to the current working directory, not the absolute cwd prefix", async () => {
		await writeFile(join(dir, "aaaa.score.svg"), "orphaned");
		const logger = { info: vi.fn() };

		await pruneOrphanedAssets({ dir, referenced: new Set(), logger });

		const [message] = logger.info.mock.calls[0] as [string];
		expect(message).not.toContain(process.cwd());
	});

	it("does not log when nothing is pruned", async () => {
		await writeFile(join(dir, "aaaa.score.svg"), "kept");
		const logger = { info: vi.fn() };

		await pruneOrphanedAssets({
			dir,
			referenced: new Set(["aaaa.score.svg"]),
			logger,
		});

		expect(logger.info).not.toHaveBeenCalled();
	});

	it("keeps everything referenced", async () => {
		await mkdir(dir, { recursive: true });
		await writeFile(join(dir, "aaaa.score.svg"), "kept");
		await writeFile(join(dir, "bbbb.score.png"), "kept");

		await pruneOrphanedAssets({
			dir,
			referenced: new Set(["aaaa.score.svg", "bbbb.score.png"]),
		});

		expect((await readdir(dir)).sort()).toEqual([
			"aaaa.score.svg",
			"bbbb.score.png",
		]);
	});
});

describe("pruneStaleAssets", () => {
	it("deletes nothing on a source's first pass", async () => {
		const assetsBySource = new Map<string, Set<string>>();
		await writeFile(join(dir, "abc123.score.svg"), "");

		await pruneStaleAssets({
			assetsBySource,
			sourceKey: "/proj/score.ly",
			fileNames: ["abc123.score.svg"],
			outputDir: dir,
		});

		expect(await readdir(dir)).toEqual(["abc123.score.svg"]);
		expect(assetsBySource.get("/proj/score.ly")).toEqual(
			new Set(["abc123.score.svg"]),
		);
	});

	it("deletes the old hash once the same source produces a new one", async () => {
		const assetsBySource = new Map<string, Set<string>>();
		await writeFile(join(dir, "old123.score.svg"), "");
		await writeFile(join(dir, "new456.score.svg"), "");

		await pruneStaleAssets({
			assetsBySource,
			sourceKey: "/proj/score.ly",
			fileNames: ["old123.score.svg"],
			outputDir: dir,
		});
		await pruneStaleAssets({
			assetsBySource,
			sourceKey: "/proj/score.ly",
			fileNames: ["new456.score.svg"],
			outputDir: dir,
		});

		expect(await readdir(dir)).toEqual(["new456.score.svg"]);
	});

	it("never touches another source's assets, even with a matching title", async () => {
		const assetsBySource = new Map<string, Set<string>>();
		await writeFile(join(dir, "aaa.index.svg"), "");
		await writeFile(join(dir, "bbb.index.svg"), "");

		// Two different sources (e.g. two different index.md files) both
		// happen to render to files titled "index".
		await pruneStaleAssets({
			assetsBySource,
			sourceKey: "/proj/docs/a/index.md",
			fileNames: ["aaa.index.svg"],
			outputDir: dir,
		});
		await pruneStaleAssets({
			assetsBySource,
			sourceKey: "/proj/docs/b/index.md",
			fileNames: ["bbb.index.svg"],
			outputDir: dir,
		});

		// Editing source A's block again shouldn't delete source B's file.
		await pruneStaleAssets({
			assetsBySource,
			sourceKey: "/proj/docs/a/index.md",
			fileNames: ["ccc.index.svg"],
			outputDir: dir,
		});

		expect((await readdir(dir)).sort()).toEqual(["bbb.index.svg"]);
	});

	it("keeps every filename still produced by a multi-block source", async () => {
		const assetsBySource = new Map<string, Set<string>>();
		await writeFile(join(dir, "aaa.syntax.svg"), "");
		await writeFile(join(dir, "bbb.syntax.svg"), "");
		await writeFile(join(dir, "ccc.syntax.svg"), "");

		await pruneStaleAssets({
			assetsBySource,
			sourceKey: "/proj/docs/syntax.md",
			fileNames: ["aaa.syntax.svg", "bbb.syntax.svg", "ccc.syntax.svg"],
			outputDir: dir,
		});
		// One of the three blocks was edited (writeAsset already wrote its new
		// file by the time pruneStaleAssets runs); the other two are unchanged.
		await writeFile(join(dir, "zzz.syntax.svg"), "");
		await pruneStaleAssets({
			assetsBySource,
			sourceKey: "/proj/docs/syntax.md",
			fileNames: ["aaa.syntax.svg", "zzz.syntax.svg", "ccc.syntax.svg"],
			outputDir: dir,
		});

		expect((await readdir(dir)).sort()).toEqual([
			"aaa.syntax.svg",
			"ccc.syntax.svg",
			"zzz.syntax.svg",
		]);
	});

	it("deletes all previous filenames when a source stops producing any", async () => {
		const assetsBySource = new Map<string, Set<string>>();
		await writeFile(join(dir, "abc123.score.svg"), "");

		await pruneStaleAssets({
			assetsBySource,
			sourceKey: "/proj/score.ly",
			fileNames: ["abc123.score.svg"],
			outputDir: dir,
		});
		await pruneStaleAssets({
			assetsBySource,
			sourceKey: "/proj/score.ly",
			fileNames: [],
			outputDir: dir,
		});

		expect(await readdir(dir)).toEqual([]);
	});

	it("tolerates a stale file that's already gone from disk", async () => {
		const assetsBySource = new Map<string, Set<string>>();

		await pruneStaleAssets({
			assetsBySource,
			sourceKey: "/proj/score.ly",
			fileNames: ["old123.score.svg"],
			outputDir: dir,
		});

		await expect(
			pruneStaleAssets({
				assetsBySource,
				sourceKey: "/proj/score.ly",
				fileNames: ["new456.score.svg"],
				outputDir: dir,
			}),
		).resolves.toBeUndefined();
	});

	it("logs how many stale assets were pruned", async () => {
		const assetsBySource = new Map<string, Set<string>>();
		const logger = { info: vi.fn() };
		await writeFile(join(dir, "old123.score.svg"), "");

		await pruneStaleAssets({
			assetsBySource,
			sourceKey: "/proj/score.ly",
			fileNames: ["old123.score.svg"],
			outputDir: dir,
			logger,
		});
		await pruneStaleAssets({
			assetsBySource,
			sourceKey: "/proj/score.ly",
			fileNames: ["new456.score.svg"],
			outputDir: dir,
			logger,
		});

		expect(logger.info).toHaveBeenCalledWith(
			expect.stringContaining("pruned 1 stale asset"),
		);
	});
});
