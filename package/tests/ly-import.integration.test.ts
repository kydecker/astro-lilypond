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
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import lilypond, { type LilypondOptions } from "../src/index.js";

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

function contentOf(code: string | undefined): { srcs: string[] } {
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
			const result = await plugin.transform(
				source,
				join(projectDir, "score.ly"),
			);

			expect(contentOf(result?.code).srcs).toHaveLength(2);

			const files = await readdir(join(publicDir, "_lilypond"));
			expect(files.filter((f) => f.endsWith(".svg"))).toHaveLength(2);
		});

		it("renders a single cropped image when the import has a ?crop query param", async () => {
			const plugin = await getLyPlugin(new URL(`file://${publicDir}/`));
			const result = await plugin.transform(
				source,
				`${join(projectDir, "score.ly")}?crop`,
			);

			expect(contentOf(result?.code).srcs).toHaveLength(1);

			const files = await readdir(join(publicDir, "_lilypond"));
			expect(files.filter((f) => f.endsWith(".svg"))).toHaveLength(1);
		});

		it("follows a configured defaults.crop of true, rendering a single cropped image", async () => {
			const plugin = await getLyPlugin(new URL(`file://${publicDir}/`), {
				defaults: { crop: true },
			});
			const result = await plugin.transform(
				source,
				join(projectDir, "score.ly"),
			);

			expect(contentOf(result?.code).srcs).toHaveLength(1);

			const files = await readdir(join(publicDir, "_lilypond"));
			expect(files.filter((f) => f.endsWith(".svg"))).toHaveLength(1);
		});

		it("overrides a configured defaults.crop of true with a ?nocrop query param", async () => {
			const plugin = await getLyPlugin(new URL(`file://${publicDir}/`), {
				defaults: { crop: true },
			});
			const result = await plugin.transform(
				source,
				`${join(projectDir, "score.ly")}?nocrop`,
			);

			expect(contentOf(result?.code).srcs).toHaveLength(2);

			const files = await readdir(join(publicDir, "_lilypond"));
			expect(files.filter((f) => f.endsWith(".svg"))).toHaveLength(2);
		});
	},
);
