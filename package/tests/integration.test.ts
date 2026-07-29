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
import type { DataStore, LoaderContext } from "astro/loaders";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

vi.mock("astro-emit-asset/emit", () => ({
	emitAsset: async (
		_path: string,
		_cacheKey: unknown,
		generateAsset: () => Promise<unknown>,
	) => {
		const generated = await generateAsset();
		const pages = Array.isArray(generated) ? generated : [generated];
		return pages.map((page, i) => ({
			src: `/_astro/fake-${i}.svg`,
			meta: (page as { meta: unknown }).meta,
		}));
	},
}));

import { resolveLilypondBinary } from "../src/binary/index.js";
import lilypond, { type LilypondOptions } from "../src/index.js";
import { lilypondLoader } from "../src/loader.js";
import { render } from "../src/render.js";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCORES_DIR = join(__dirname, "scores");
const COLLECTION_SCORES_DIR = join(SCORES_DIR, "collection");

function svgDimensions(svg: string): { width: number; height: number } {
	const match = svg.match(/viewBox="[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)"/);
	if (!match) throw new Error("no viewBox found in SVG output");
	return { width: Number(match[1]), height: Number(match[2]) };
}

function pngDimensions(buf: Buffer): { width: number; height: number } {
	expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
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
	});

	describe("multi-page scores", () => {
		it("renders every page's SVG when crop is false", async () => {
			const result = await render(multiPageSvg, {
				format: "svg",
				crop: false,
				binaryPath,
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
			});
			expect(result).toHaveLength(2);
			for (const buf of result) {
				const { width, height } = pngDimensions(buf);
				expect(width).toBeGreaterThan(0);
				expect(height).toBeGreaterThan(0);
			}
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
				}),
				render(multiPagePng, {
					format: "png",
					crop: true,
					defaults: { resolution: 288 },
					binaryPath,
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
			});
			expect(result[0].toString("utf-8")).toContain("<svg");
		});
	});
});

interface VitePluginLike {
	transform: (src: string, id: string) => Promise<{ code: string } | undefined>;
}

function contentOf(code: string | undefined): {
	pages: { src: string; width?: number; height?: number }[];
} {
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
		logger: { info: vi.fn(), warn: vi.fn() },
	} as never);
	const { plugins } = (
		updateConfig.mock.calls[0][0] as { vite: { plugins: VitePluginLike[] } }
	).vite;
	return plugins[0];
}

describe(".ly import ?crop/?nocrop query params against the real lilypond binary", () => {
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

	it("renders uncropped (every page) by default (defaults.crop defaults to markdown-only)", async () => {
		const plugin = await getLyPlugin(new URL(`file://${publicDir}/`));
		const result = await plugin.transform(source, join(projectDir, "score.ly"));

		expect(contentOf(result?.code).pages).toHaveLength(2);
	});

	it("renders a single cropped image when the import has a ?crop query param", async () => {
		const plugin = await getLyPlugin(new URL(`file://${publicDir}/`));
		const result = await plugin.transform(
			source,
			`${join(projectDir, "score.ly")}?crop`,
		);

		expect(contentOf(result?.code).pages).toHaveLength(1);
	});

	it("follows a configured defaults.crop of true, rendering a single cropped image", async () => {
		const plugin = await getLyPlugin(new URL(`file://${publicDir}/`), {
			defaults: { crop: true },
		});
		const result = await plugin.transform(source, join(projectDir, "score.ly"));

		expect(contentOf(result?.code).pages).toHaveLength(1);
	});

	it("overrides a configured defaults.crop of true with a ?nocrop query param", async () => {
		const plugin = await getLyPlugin(new URL(`file://${publicDir}/`), {
			defaults: { crop: true },
		});
		const result = await plugin.transform(
			source,
			`${join(projectDir, "score.ly")}?nocrop`,
		);

		expect(contentOf(result?.code).pages).toHaveLength(2);
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

	it("parses header metadata and real page dimensions for every fixture", async () => {
		const loader = lilypondLoader({
			base: pathToFileURL(`${COLLECTION_SCORES_DIR}/`),
		});
		const context = createFakeLoaderContext(root, publicDir);
		await loader.load(context);

		const sonata = context.store.get("sonata");
		expect(sonata).toBeDefined();
		const sonataData = sonata?.data as { pages: { width?: number }[] };
		expect(sonataData).toMatchObject({
			pages: [{ src: expect.stringMatching(/^\/_astro\//) }],
			alt: "Sonata, by Beethoven",
			title: "Sonata",
			composer: "Beethoven",
			extra: { mutopiacomposer: "BeethovenLV" },
		});
		expect(sonataData.pages[0].width).toBeGreaterThan(0);

		const prelude = context.store.get("prelude");
		expect(prelude?.data).toMatchObject({
			piece: "Prelude",
		});
	});
});
