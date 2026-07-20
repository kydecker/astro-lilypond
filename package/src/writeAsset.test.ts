import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeAsset } from "./writeAsset.js";

let dir: string;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "astro-lilypond-write-asset-"));
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe("writeAsset", () => {
	it("writes the buffer to <outputDir>/<hash>.<title>.<format> and returns its URL", async () => {
		const outputDir = join(dir, "_lilypond");
		const getBuffer = vi.fn().mockResolvedValue(Buffer.from("<svg></svg>"));

		const url = await writeAsset({
			hash: "abc123",
			title: "bach-bwv610",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffer,
		});

		expect(url).toBe("/_lilypond/abc123.bach-bwv610.svg");
		expect(
			await readFile(join(outputDir, "abc123.bach-bwv610.svg"), "utf8"),
		).toBe("<svg></svg>");
	});

	it("creates the output directory when it doesn't exist", async () => {
		const outputDir = join(dir, "nested", "_lilypond");
		await writeAsset({
			hash: "abc123",
			title: "score",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffer: vi.fn().mockResolvedValue(Buffer.from("<svg></svg>")),
		});

		expect(await readdir(outputDir)).toContain("abc123.score.svg");
	});

	it("leaves no leftover temp files after a successful write", async () => {
		const outputDir = join(dir, "_lilypond");
		await writeAsset({
			hash: "abc123",
			title: "score",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffer: vi.fn().mockResolvedValue(Buffer.from("<svg></svg>")),
		});

		expect(await readdir(outputDir)).toEqual(["abc123.score.svg"]);
	});

	it("skips calling getBuffer when the file already exists", async () => {
		const outputDir = join(dir, "_lilypond");
		const getBuffer = vi.fn().mockResolvedValue(Buffer.from("<svg></svg>"));

		await writeAsset({
			hash: "abc123",
			title: "score",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffer,
		});
		expect(getBuffer).toHaveBeenCalledTimes(1);

		const url = await writeAsset({
			hash: "abc123",
			title: "score",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffer,
		});

		expect(url).toBe("/_lilypond/abc123.score.svg");
		expect(getBuffer).toHaveBeenCalledTimes(1);
	});

	it("calls trackAsset with the file name on a cache miss", async () => {
		const outputDir = join(dir, "_lilypond");
		const trackAsset = vi.fn();

		await writeAsset({
			hash: "abc123",
			title: "score",
			format: "png",
			outputDir,
			urlBase: "/_lilypond",
			trackAsset,
			getBuffer: vi.fn().mockResolvedValue(Buffer.from([0x89, 0x50])),
		});

		expect(trackAsset).toHaveBeenCalledWith("abc123.score.png");
	});

	it("calls trackAsset with the file name on a cache hit", async () => {
		const outputDir = join(dir, "_lilypond");
		const getBuffer = vi.fn().mockResolvedValue(Buffer.from("<svg></svg>"));
		await writeAsset({
			hash: "abc123",
			title: "score",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffer,
		});

		const trackAsset = vi.fn();
		await writeAsset({
			hash: "abc123",
			title: "score",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			trackAsset,
			getBuffer,
		});

		expect(trackAsset).toHaveBeenCalledWith("abc123.score.svg");
	});

	it("uses the format as the file extension", async () => {
		const outputDir = join(dir, "_lilypond");
		const url = await writeAsset({
			hash: "abc123",
			title: "score",
			format: "png",
			outputDir,
			urlBase: "/_lilypond",
			getBuffer: vi.fn().mockResolvedValue(Buffer.from([0x89, 0x50])),
		});

		expect(url).toBe("/_lilypond/abc123.score.png");
	});

	it("uses a different title for the same hash without colliding", async () => {
		const outputDir = join(dir, "_lilypond");
		const urlA = await writeAsset({
			hash: "abc123",
			title: "bach-bwv610",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffer: vi.fn().mockResolvedValue(Buffer.from("a")),
		});
		const urlB = await writeAsset({
			hash: "abc123",
			title: "granados-goyescas",
			format: "svg",
			outputDir,
			urlBase: "/_lilypond",
			getBuffer: vi.fn().mockResolvedValue(Buffer.from("b")),
		});

		expect(urlA).toBe("/_lilypond/abc123.bach-bwv610.svg");
		expect(urlB).toBe("/_lilypond/abc123.granados-goyescas.svg");
		expect((await readdir(outputDir)).sort()).toEqual([
			"abc123.bach-bwv610.svg",
			"abc123.granados-goyescas.svg",
		]);
	});
});
