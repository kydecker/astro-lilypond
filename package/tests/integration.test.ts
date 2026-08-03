/**
 * Exercises `render()`, `lilypond()`, and `lilypondLoader()` against a real
 * `lilypond` binary.
 *
 * Run explicitly with `npm run test:integration` — excluded from the
 * default `npm test` run due to slower speeds.
 */
import { execFile, execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { DataStore, LoaderContext } from "astro/loaders";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

// Mirrors the real `astro-emit-asset`'s own overload behavior: an array
// `generateAsset()` result emits one asset per element; a bare (non-array)
// result — as `emitLilypondPdfAsset` returns — emits a single asset object,
// not a one-element array.
vi.mock("astro-emit-asset/emit", () => ({
	emitAsset: async (
		_path: string,
		_cacheKey: unknown,
		generateAsset: () => Promise<unknown>,
	) => {
		const generated = await generateAsset();
		if (Array.isArray(generated)) {
			return generated.map((page, i) => ({
				src: `/_astro/fake-${i}.svg`,
				meta: (page as { meta: unknown }).meta,
			}));
		}
		return {
			src: "/_astro/fake.pdf",
			meta: (generated as { meta: unknown }).meta,
		};
	},
}));

import { resolveLilypondBinary } from "../src/binary/index.js";
import lilypond, {
	type LilypondOptions,
	type LilypondScore,
	render as renderScore,
} from "../src/index.js";
import { lilypondLoader } from "../src/loader.js";
import { render } from "../src/render.js";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCORES_DIR = join(__dirname, "scores");
const COLLECTION_SCORES_DIR = join(SCORES_DIR, "collection");
const FAKE_LOGGER = { warn: vi.fn(), error: vi.fn() };

function svgDimensions(svg: string): { width: number; height: number } {
	const match = svg.match(/viewBox="[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)"/);
	if (!match) throw new Error("no viewBox found in SVG output");
	return { width: Number(match[1]), height: Number(match[2]) };
}

function pngDimensions(buf: Buffer): { width: number; height: number } {
	expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Renders a `Score` component (from `render()`) via a real Astro container. */
async function renderScoreHtml(
	Score: AstroComponentFactory,
	props: Record<string, unknown> = {},
): Promise<string> {
	const container = await AstroContainer.create();
	return container.renderToString(Score, { props });
}

function pageCount(html: string): number {
	return html.match(/data-lilypond-image/g)?.length ?? 0;
}

describe.concurrent("render() against the real lilypond binary", () => {
	let multiPagePng: string;
	let multiPageSvg: string;
	let binaryPath: string;

	beforeAll(async () => {
		[multiPagePng, multiPageSvg, binaryPath] = await Promise.all([
			readFile(join(SCORES_DIR, "multi-page-png.ly"), "utf8"),
			readFile(join(SCORES_DIR, "multi-page-svg.ly"), "utf8"),
			resolveLilypondBinary({ autoInstall: true }),
		]);
	});

	describe("LilyPond output-file naming (pinned via direct invocation)", () => {
		it("names uncropped multi-page SVG output <base>-N.svg", async () => {
			const dir = await mkdtemp(join(tmpdir(), "lilypond-naming-"));
			try {
				const inputPath = join(dir, "input.ly");
				const outputBase = join(dir, "output");
				await writeFile(inputPath, multiPageSvg, "utf8");
				await execFileAsync(binaryPath, [
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
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		});

		it("names uncropped multi-page PNG output <base>-pageN.png", async () => {
			const dir = await mkdtemp(join(tmpdir(), "lilypond-naming-"));
			try {
				const inputPath = join(dir, "input.ly");
				const outputBase = join(dir, "output");
				await writeFile(inputPath, multiPagePng, "utf8");
				await execFileAsync(binaryPath, [
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
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		});

		it("names a multi-page PDF as a single <base>.pdf, unlike SVG/PNG which split into numbered files", async () => {
			const dir = await mkdtemp(join(tmpdir(), "lilypond-naming-"));
			try {
				const inputPath = join(dir, "input.ly");
				const outputBase = join(dir, "output");
				await writeFile(inputPath, multiPageSvg, "utf8");
				await execFileAsync(binaryPath, [
					"--format=pdf",
					"--define-default=no-point-and-click",
					"--define-default=backend=cairo",
					"--output",
					outputBase,
					inputPath,
				]);
				const files = (await readdir(dir)).filter((f) => f.endsWith(".pdf"));
				expect(files).toEqual(["output.pdf"]);
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		});
	});

	describe("multi-page scores", () => {
		it("renders every page's SVG when crop is false", async () => {
			const result = await render(multiPageSvg, {
				format: "svg",
				crop: false,
				binaryPath,
				logger: FAKE_LOGGER,
			});
			expect(result).toHaveLength(2);
			for (const buf of result) {
				const svg = buf.toString("utf-8");
				expect(svg).toContain("<svg");
				const { width, height } = svgDimensions(svg);
				// Each is a single uncropped US-letter page, not the tall
				// merged image crop:true would produce for a 2-page score.
				expect(height / width).toBeLessThan(2);
			}
		});

		it("merges all pages into one tall image when crop is true", async () => {
			const result = await render(multiPageSvg, {
				format: "svg",
				crop: true,
				binaryPath,
				logger: FAKE_LOGGER,
			});
			expect(result).toHaveLength(1);
			const svg = result[0].toString("utf-8");
			const { width, height } = svgDimensions(svg);
			// multi-page-svg.ly is a 2-page score; the cropped merge stacks
			// systems from all pages into a single much-taller-than-wide image.
			expect(height / width).toBeGreaterThan(2);
		});
	});

	describe("png format", () => {
		it("renders valid PNG bytes", async () => {
			const result = await render(multiPagePng, {
				format: "png",
				crop: true,
				binaryPath,
				logger: FAKE_LOGGER,
			});
			expect(result).toHaveLength(1);
			const { width, height } = pngDimensions(result[0]);
			expect(width).toBeGreaterThan(0);
			expect(height).toBeGreaterThan(0);
		});

		it("renders every page of a multi-page score to PNG when crop is false", async () => {
			const result = await render(multiPagePng, {
				format: "png",
				crop: false,
				binaryPath,
				logger: FAKE_LOGGER,
			});
			expect(result).toHaveLength(2);
			for (const buf of result) {
				const { width, height } = pngDimensions(buf);
				expect(width).toBeGreaterThan(0);
				expect(height).toBeGreaterThan(0);
			}
		});
	});

	describe("pdf format", () => {
		it("renders a multi-page score to a single valid PDF file", async () => {
			const result = await render(multiPageSvg, {
				format: "pdf",
				crop: false,
				binaryPath,
				logger: FAKE_LOGGER,
			});
			expect(result).toHaveLength(1);
			expect(result[0].subarray(0, 5).toString("utf-8")).toBe("%PDF-");
		});
	});

	describe("resolution", () => {
		it("increases PNG pixel dimensions roughly proportionally to resolution", async () => {
			const [low, high] = await Promise.all([
				render(multiPagePng, {
					format: "png",
					crop: true,
					defaults: { resolution: 72 },
					binaryPath,
					logger: FAKE_LOGGER,
				}),
				render(multiPagePng, {
					format: "png",
					crop: true,
					defaults: { resolution: 288 },
					binaryPath,
					logger: FAKE_LOGGER,
				}),
			]);
			const lowDim = pngDimensions(low[0]);
			const highDim = pngDimensions(high[0]);
			const ratio = highDim.width / lowDim.width;
			// resolution quadruples (72 -> 288); pixel width should scale
			// with it, allowing slack for rounding at page-fitting time.
			expect(ratio).toBeGreaterThan(3);
			expect(ratio).toBeLessThan(5);
		});
	});

	describe("binaryPath", () => {
		it("renders successfully with an explicit absolute binary path", async () => {
			const absolutePath =
				binaryPath === "lilypond"
					? execFileSync("which", ["lilypond"]).toString().trim()
					: binaryPath;
			const result = await render("{ c'4 d'4 e'4 f'4 }", {
				binaryPath: absolutePath,
				logger: FAKE_LOGGER,
			});
			expect(result[0].toString("utf-8")).toContain("<svg");
		});
	});
});

interface VitePluginLike {
	transform: (src: string, id: string) => Promise<{ code: string } | undefined>;
}

function scoreFrom(code: string | undefined): LilypondScore {
	return JSON.parse(code?.replace(/^export default /, "") ?? "null");
}

async function getLyPlugin(
	publicDirUrl: URL,
	options: LilypondOptions = {},
): Promise<VitePluginLike> {
	const updateConfig = vi.fn();
	const integration = lilypond(options);
	await integration.hooks["astro:config:setup"]?.({
		command: "build",
		config: {
			publicDir: publicDirUrl,
			base: "/",
			markdown: { processor: { name: "satteri", options: {} } },
		},
		updateConfig,
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	} as never);
	const { plugins } = (
		updateConfig.mock.calls[0][0] as { vite: { plugins: VitePluginLike[] } }
	).vite;
	return plugins[0];
}

describe(".ly import + render() against the real lilypond binary", () => {
	let projectDir: string;
	let publicDir: string;
	let source: string;

	beforeEach(async () => {
		projectDir = await mkdtemp(join(tmpdir(), "astro-lilypond-ly-import-"));
		publicDir = join(projectDir, "public");
		source = await readFile(join(SCORES_DIR, "multi-page-svg.ly"), "utf8");
	});

	afterEach(async () => {
		await rm(projectDir, { recursive: true, force: true });
	});

	// getLyPlugin() runs astro:config:setup, which resolves the real
	// binary and populates the renderState singleton that the public
	// render() reads from — so render() can be called directly afterward.
	async function transformToScore(options: LilypondOptions = {}) {
		const plugin = await getLyPlugin(new URL(`file://${publicDir}/`), options);
		const result = await plugin.transform(source, join(projectDir, "score.ly"));
		return scoreFrom(result?.code);
	}

	it("transforms a .ly file into a LilypondScore handle, without rendering anything", async () => {
		const score = await transformToScore();
		expect(score.source).toContain("\\version");
		expect(score.source).not.toContain("<svg");
	});

	it("renders uncropped (every page) by default", async () => {
		const score = await transformToScore();
		const { Score, pageCount: count } = await renderScore(score);
		const html = await renderScoreHtml(Score);
		expect(pageCount(html)).toBe(2);
		expect(count).toBe(2);
	});

	it("renders a single cropped image when the call passes crop: true", async () => {
		const score = await transformToScore();
		const { Score } = await renderScore(score, { crop: true });
		const html = await renderScoreHtml(Score);
		expect(pageCount(html)).toBe(1);
	});

	it("renders Score and pdf concurrently from the same score when pdf: true", async () => {
		const score = await transformToScore();
		const { Score, pdf } = await renderScore(score, { pdf: true });
		const html = await renderScoreHtml(Score);
		expect(pageCount(html)).toBe(2);
		expect(pdf?.src).toEqual(expect.any(String));
	});
});

function createFakeLoaderContext(
	root: string,
	publicDir: string,
): LoaderContext {
	const data = new Map<string, Parameters<DataStore["set"]>[0]>();
	return {
		collection: "scores",
		store: {
			get: (key: string) => data.get(key),
			set: (entry: Parameters<DataStore["set"]>[0]) => {
				data.set(entry.id, entry);
				return true;
			},
			keys: () => [...data.keys()],
			delete: (key: string) => data.delete(key),
			has: (key: string) => data.has(key),
			values: () => [...data.values()],
			entries: () => [...data.entries()],
			clear: () => data.clear(),
			addModuleImport: () => {},
		},
		meta: {
			get: () => undefined,
			set: () => {},
			has: () => false,
			delete: () => {},
		},
		logger: { info() {}, warn() {}, error() {}, debug() {} } as never,
		config: {
			root: pathToFileURL(`${root}/`),
			publicDir: pathToFileURL(`${publicDir}/`),
			base: "/",
		} as never,
		parseData: async ({ data: entryData }: { data: Record<string, unknown> }) =>
			entryData,
		renderMarkdown: (async () => ({ html: "" })) as never,
		generateDigest: (input: Record<string, unknown> | string) =>
			typeof input === "string" ? input : JSON.stringify(input),
	} as unknown as LoaderContext;
}

describe("lilypondLoader() against the real lilypond binary", () => {
	let root: string;
	let publicDir: string;

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), "astro-lilypond-loader-int-"));
		publicDir = join(root, "public");
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});

	it("parses header metadata for every fixture, without rendering anything at sync time", async () => {
		const loader = lilypondLoader({
			base: pathToFileURL(`${COLLECTION_SCORES_DIR}/`),
		});
		const context = createFakeLoaderContext(root, publicDir);
		await loader.load(context);

		const sonata = context.store.get("sonata");
		expect(sonata).toBeDefined();
		const sonataData = sonata?.data as unknown as LilypondScore;
		expect(sonataData).toMatchObject({
			source: expect.stringContaining("\\version"),
			alt: "Sonata, by Beethoven",
			meta: {
				title: "Sonata",
				composer: "Beethoven",
				mutopiacomposer: "BeethovenLV",
			},
		});

		const prelude = context.store.get("prelude");
		expect(prelude?.data).toMatchObject({
			meta: { piece: "Prelude" },
		});
	});

	it("exposes each entry as a LilypondScore that render() can use directly, for both the display image and a PDF download", async () => {
		const loader = lilypondLoader({
			base: pathToFileURL(`${COLLECTION_SCORES_DIR}/`),
		});
		const context = createFakeLoaderContext(root, publicDir);
		await loader.load(context);

		const sonata = context.store.get("sonata");
		const sonataData = sonata?.data as unknown as LilypondScore;

		const { Score, pdf } = await renderScore(sonataData, { pdf: true });
		const html = await renderScoreHtml(Score);
		expect(html).toContain("data-lilypond-image");
		expect(html).toMatch(/width="\d+/);
		expect(pdf?.src).toEqual(expect.any(String));
	});
});
