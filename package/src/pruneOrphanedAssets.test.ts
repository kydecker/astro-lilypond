import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pruneOrphanedAssets } from "./pruneOrphanedAssets.js";

let dir: string;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "astro-lilypond-prune-"));
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
