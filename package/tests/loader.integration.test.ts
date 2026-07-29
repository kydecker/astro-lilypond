/**
 * Exercises `lilypondLoader()` against a real `lilypond` binary.
 * Real SVG files should be emitted via `astro-emit-asset` and land on disk
 * once the build is finalized, and header metadata (including a nested
 * `\score`-level `\markup` field and a non-standard `extra` field) should be
 * parsed correctly from real fixture files.
 *
 * Run explicitly with `npm run test:integration`.
 */
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { DataStore, LoaderContext } from "astro/loaders";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lilypondLoader } from "../src/loader.js";
import { registerEmitAsset } from "./registerEmitAsset.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCORES_DIR = join(__dirname, "scores", "collection");

function createFakeContext(root: string, publicDir: string): LoaderContext {
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
});
