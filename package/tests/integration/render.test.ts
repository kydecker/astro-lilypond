/**
 * Exercises `render()` against the real `lilypond` binary. This
 * catches drift between our assumptions about LilyPond's CLI (output file
 * naming, page numbering, format flags) and its actual behavior, which
 * `render.test.ts`'s mocked suite cannot.
 *
 * Skips entirely if `lilypond` isn't on PATH. Run explicitly with
 * `npm run test:integration` — excluded from the default `npm test` run
 * due to slower speeds.
 */
import { execFile, execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { render } from "../../src/render.js";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCORES_DIR = join(__dirname, "scores");

function lilypondAvailable(): boolean {
	try {
		execFileSync("lilypond", ["--version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

function svgDimensions(svg: string): { width: number; height: number } {
	const match = svg.match(
		/viewBox="[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)"/,
	);
	if (!match) throw new Error("no viewBox found in SVG output");
	return { width: Number(match[1]), height: Number(match[2]) };
}

function pngDimensions(buf: Buffer): { width: number; height: number } {
	expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe.skipIf(!lilypondAvailable())(
	"render() against the real lilypond binary",
	() => {
		let voyager: string;
		let aria: string;

		beforeAll(async () => {
			[voyager, aria] = await Promise.all([
				readFile(join(SCORES_DIR, "voyager.ly"), "utf8"),
				readFile(join(SCORES_DIR, "aria-of-the-soul.ly"), "utf8"),
			]);
		});

		// Pins down LilyPond's actual output-file naming per format, run
		// directly against the binary (bypassing render()'s own assumptions
		// about that naming). If these fail, LilyPond's conventions changed
		// and render()'s readOutputFile() fallback logic needs updating.
		describe("LilyPond output-file naming (pinned via direct invocation)", () => {
			let dir: string;

			afterEach(async () => {
				if (dir) await rm(dir, { recursive: true, force: true });
			});

			it("names uncropped multi-page SVG output <base>-N.svg", async () => {
				dir = await mkdtemp(join(tmpdir(), "lilypond-naming-"));
				const inputPath = join(dir, "input.ly");
				const outputBase = join(dir, "output");
				await writeFile(inputPath, aria, "utf8");
				await execFileAsync("lilypond", [
					"--svg",
					"--define-default=no-point-and-click",
					"--silent",
					"--output",
					outputBase,
					inputPath,
				]);
				const files = (await readdir(dir)).filter((f) => f.endsWith(".svg"));
				expect(files.sort()).toEqual(
					expect.arrayContaining(["output-1.svg", "output-2.svg"]),
				);
			});

			it("names uncropped multi-page PNG output <base>-pageN.png", async () => {
				dir = await mkdtemp(join(tmpdir(), "lilypond-naming-"));
				const inputPath = join(dir, "input.ly");
				const outputBase = join(dir, "output");
				await writeFile(inputPath, voyager, "utf8");
				await execFileAsync("lilypond", [
					"--png",
					"--define-default=no-point-and-click",
					"--output",
					outputBase,
					inputPath,
				]);
				const files = (await readdir(dir)).filter((f) => f.endsWith(".png"));
				expect(files.sort()).toEqual(
					expect.arrayContaining(["output-page1.png", "output-page2.png"]),
				);
			});
		});

		describe("multi-page scores", () => {
			it("renders the first page's SVG without throwing when crop is false", async () => {
				const result = await render(aria, { format: "svg", crop: false });
				const svg = result.toString("utf-8");
				expect(svg).toContain("<svg");
				const { width, height } = svgDimensions(svg);
				// A single uncropped US-letter page, not the tall merged image
				// crop:true would produce for a 3-page score.
				expect(height / width).toBeLessThan(2);
			});

			it("merges all pages into one tall image when crop is true", async () => {
				const result = await render(aria, { format: "svg", crop: true });
				const svg = result.toString("utf-8");
				const { width, height } = svgDimensions(svg);
				// aria-of-the-soul is a 3-page score; the cropped merge stacks
				// systems from all pages into a single much-taller-than-wide image.
				expect(height / width).toBeGreaterThan(2);
			});
		});

		describe("png format", () => {
			it("renders valid PNG bytes", async () => {
				const result = await render(voyager, { format: "png", crop: true });
				const { width, height } = pngDimensions(result);
				expect(width).toBeGreaterThan(0);
				expect(height).toBeGreaterThan(0);
			});

			it("renders a multi-page score to PNG when crop is false", async () => {
				const result = await render(voyager, { format: "png", crop: false });
				const { width, height } = pngDimensions(result);
				expect(width).toBeGreaterThan(0);
				expect(height).toBeGreaterThan(0);
			});
		});

		describe("resolution", () => {
			it("increases PNG pixel dimensions roughly proportionally to resolution", async () => {
				const [low, high] = await Promise.all([
					render(voyager, { format: "png", crop: true, resolution: 72 }),
					render(voyager, { format: "png", crop: true, resolution: 288 }),
				]);
				const lowDim = pngDimensions(low);
				const highDim = pngDimensions(high);
				const ratio = highDim.width / lowDim.width;
				// resolution quadruples (72 -> 288); pixel width should scale
				// with it, allowing slack for rounding at page-fitting time.
				expect(ratio).toBeGreaterThan(3);
				expect(ratio).toBeLessThan(5);
			});
		});

		describe("binaryPath", () => {
			it("renders successfully with an explicit absolute binary path", async () => {
				const binaryPath = execFileSync("which", ["lilypond"])
					.toString()
					.trim();
				const result = await render("{ c'4 d'4 e'4 f'4 }", { binaryPath });
				expect(result.toString("utf-8")).toContain("<svg");
			});
		});
	},
);
