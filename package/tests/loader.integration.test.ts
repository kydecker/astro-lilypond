/**
 * Exercises `lilypondLoader()` against the real `lilypond` binary: real SVG
 * files should be emitted via `astro-emit-asset` and land on disk once the
 * build is finalized, and header metadata (including a nested `\score`-level
 * `\markup` field and a non-standard `extra` field) should be parsed
 * correctly from real fixture files.
 *
 * Skips entirely if `lilypond` isn't on PATH. Run explicitly with
 * `npm run test:integration`.
 */
import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { DataEntry, LoaderContext } from "astro/loaders";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lilypondLoader } from "../src/loader.js";
import { registerEmitAsset } from "./registerEmitAsset.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCORES_DIR = join(__dirname, "scores", "collection");

function lilypondAvailable(): boolean {
	try {
		execFileSync("lilypond", ["--version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

function createFakeContext(root: string, publicDir: string): LoaderContext {
	const data = new Map<string, DataEntry>();
	return {
		collection: "scores",
		store: {
			get: (key: string) => data.get(key),
			set: (entry: DataEntry) => {
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
		parseData: async ({ data: entryData }) => entryData,
		renderMarkdown: (async () => ({ html: "" })) as never,
		generateDigest: (input) =>
			typeof input === "string" ? input : JSON.stringify(input),
	} as unknown as LoaderContext;
}

describe.skipIf(!lilypondAvailable())(
	"lilypondLoader() against the real lilypond binary",
	() => {
		let root: string;
		let publicDir: string;
		let finalizeBuild: (dir: URL) => Promise<void>;

		beforeEach(async () => {
			root = await mkdtemp(join(tmpdir(), "astro-lilypond-loader-int-"));
			publicDir = join(root, "public");
			({ finalizeBuild } = await registerEmitAsset({
				cacheDir: pathToFileURL(`${join(root, ".astro")}/`),
			}));
		});

		afterEach(async () => {
			await rm(root, { recursive: true, force: true });
		});

		it("writes real SVG files and parses header metadata for every fixture", async () => {
			const loader = lilypondLoader({ base: pathToFileURL(`${SCORES_DIR}/`) });
			const context = createFakeContext(root, publicDir);
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

			// Verify the real SVG files actually land on disk once the build
			// is finalized (astro-emit-asset's active-asset copy step).
			const distDir = join(root, "dist");
			await finalizeBuild(pathToFileURL(`${distDir}/`));
			const files = await readdir(join(distDir, "_astro"));
			expect(
				files.filter((f) => f.endsWith(".svg")).length,
			).toBeGreaterThanOrEqual(2);
		});
	},
);
