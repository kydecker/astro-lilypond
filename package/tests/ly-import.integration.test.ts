/**
 * Exercises the `.ly` Vite import transform's `?crop`/`?nocrop` query-param
 * handling against the real `lilypond` binary — the actual mechanism
 * `<LilyPond>` component usage relies on for a per-instance crop override
 * of the `defaults.crop` config.
 *
 * Skips entirely if `lilypond` isn't on PATH. Run explicitly with
 * `npm run test:integration`.
 */
import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import lilypond, { type LilypondOptions } from "../src/index.js";
import { registerEmitAsset } from "./registerEmitAsset.js";

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

describe.skipIf(!lilypondAvailable())(
	".ly import ?crop/?nocrop query params against the real lilypond binary",
	() => {
		let projectDir: string;
		let publicDir: string;
		let source: string;
		let finalizeBuild: (dir: URL) => Promise<void>;

		beforeEach(async () => {
			projectDir = await mkdtemp(join(tmpdir(), "astro-lilypond-ly-import-"));
			publicDir = join(projectDir, "public");
			source = await readFile(join(SCORES_DIR, "multi-page-svg.ly"), "utf8");
			({ finalizeBuild } = await registerEmitAsset({
				cacheDir: pathToFileURL(`${join(projectDir, ".astro")}/`),
			}));
		});

		afterEach(async () => {
			await rm(projectDir, { recursive: true, force: true });
		});

		/** Copies whatever was emitted since the last call into a fresh `dist/_astro` and lists its `.svg` files. */
		async function emittedSvgFiles(): Promise<string[]> {
			const distDir = join(projectDir, "dist");
			await finalizeBuild(pathToFileURL(`${distDir}/`));
			const files = await readdir(join(distDir, "_astro"));
			return files.filter((f) => f.endsWith(".svg"));
		}

		it("renders uncropped (every page) by default (defaults.crop defaults to markdown-only)", async () => {
			const plugin = await getLyPlugin(new URL(`file://${publicDir}/`));
			const result = await plugin.transform(
				source,
				join(projectDir, "score.ly"),
			);

			expect(contentOf(result?.code).pages).toHaveLength(2);
			expect(await emittedSvgFiles()).toHaveLength(2);
		});

		it("renders a single cropped image when the import has a ?crop query param", async () => {
			const plugin = await getLyPlugin(new URL(`file://${publicDir}/`));
			const result = await plugin.transform(
				source,
				`${join(projectDir, "score.ly")}?crop`,
			);

			expect(contentOf(result?.code).pages).toHaveLength(1);
			expect(await emittedSvgFiles()).toHaveLength(1);
		});

		it("follows a configured defaults.crop of true, rendering a single cropped image", async () => {
			const plugin = await getLyPlugin(new URL(`file://${publicDir}/`), {
				defaults: { crop: true },
			});
			const result = await plugin.transform(
				source,
				join(projectDir, "score.ly"),
			);

			expect(contentOf(result?.code).pages).toHaveLength(1);
			expect(await emittedSvgFiles()).toHaveLength(1);
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
			expect(await emittedSvgFiles()).toHaveLength(2);
		});
	},
);
