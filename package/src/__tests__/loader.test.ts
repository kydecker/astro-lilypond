import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { DataStore } from "astro/loaders";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { lilypondEntrySchema, lilypondLoader } from "../loader.js";
import { resetLilypondStateForTests, setLilypondState } from "../state.js";

/** Minimal in-memory stand-in for Astro's content-layer DataStore. */
function createFakeStore() {
	const data = new Map<string, Parameters<DataStore["set"]>[0]>();
	return {
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
		addModuleImport: vi.fn(),
		raw: data,
	};
}

function createFakeWatcher() {
	const handlers = new Map<string, ((path: string) => void)[]>();
	return {
		add: vi.fn(),
		on: vi.fn((event: string, handler: (path: string) => void) => {
			const existing = handlers.get(event) ?? [];
			existing.push(handler);
			handlers.set(event, existing);
			return undefined as unknown;
		}),
		emit: (event: string, path: string) => {
			for (const handler of handlers.get(event) ?? []) handler(path);
		},
	};
}

interface FakeContextOptions {
	root: string;
	publicDir: string;
	store?: ReturnType<typeof createFakeStore>;
	watcher?: ReturnType<typeof createFakeWatcher>;
	logger?: {
		info: ReturnType<typeof vi.fn>;
		warn: ReturnType<typeof vi.fn>;
		error: ReturnType<typeof vi.fn>;
	};
	parseData?: (input: {
		data: Record<string, unknown>;
	}) => Promise<Record<string, unknown>>;
}

function createFakeContext(options: FakeContextOptions) {
	const store = options.store ?? createFakeStore();
	const logger = options.logger ?? {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};
	return {
		context: {
			collection: "scores",
			store,
			meta: { get: vi.fn(), set: vi.fn(), has: vi.fn(), delete: vi.fn() },
			logger,
			config: {
				root: pathToFileURL(`${options.root}/`),
				publicDir: pathToFileURL(`${options.publicDir}/`),
				base: "/",
			},
			parseData:
				options.parseData ??
				(async ({ data }: { data: Record<string, unknown> }) => data),
			renderMarkdown: vi.fn(),
			generateDigest: (input: unknown) =>
				typeof input === "string" ? input : JSON.stringify(input),
			watcher: options.watcher as never,
		} as never,
		store,
		logger,
	};
}

let root: string;
let scoresDir: string;
let publicDir: string;

beforeEach(async () => {
	root = await mkdtemp(join(tmpdir(), "astro-lilypond-loader-test-"));
	scoresDir = join(root, "src", "scores");
	publicDir = join(root, "public");
	await mkdir(scoresDir, { recursive: true });
	await mkdir(publicDir, { recursive: true });
	setLilypondState({
		binaryPath: "lilypond",
		defaults: undefined,
		timeout: undefined,
		isDev: false,
		logger: { warn: vi.fn(), error: vi.fn() },
	});
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
	resetLilypondStateForTests();
});

describe("lilypondLoader", () => {
	it("populates the store with source/alt/header for each matched file, without rendering anything", async () => {
		await writeFile(
			join(scoresDir, "sonata.ly"),
			'\\header { title = "Sonata" composer = "Beethoven" mutopiacomposer = "BeethovenLV" }',
		);

		const loader = lilypondLoader({ base: "./src/scores" });
		const { context, store } = createFakeContext({ root, publicDir });
		await loader.load(context);

		const entry = store.get("sonata");
		expect(entry?.data).toMatchObject({
			source: expect.stringContaining("\\header"),
			alt: "Sonata, by Beethoven",
			meta: {
				title: "Sonata",
				composer: "Beethoven",
				mutopiacomposer: "BeethovenLV",
			},
		});
	});

	it("derives ids from the path relative to base, stripping the extension", async () => {
		await mkdir(join(scoresDir, "preludes"), { recursive: true });
		await writeFile(
			join(scoresDir, "preludes", "prelude1.ly"),
			"\\score { { c4 } }",
		);

		const loader = lilypondLoader({ base: "./src/scores" });
		const { context, store } = createFakeContext({ root, publicDir });
		await loader.load(context);

		expect(store.keys()).toEqual(["preludes/prelude1"]);
	});

	it("honors a custom generateId", async () => {
		await writeFile(join(scoresDir, "sonata.ly"), "\\score { { c4 } }");

		const loader = lilypondLoader({
			base: "./src/scores",
			generateId: ({ entry }) => `custom-${entry}`,
		});
		const { context, store } = createFakeContext({ root, publicDir });
		await loader.load(context);

		expect(store.keys()).toEqual(["custom-sonata.ly"]);
	});

	it("accepts a base already given as a URL", async () => {
		await writeFile(join(scoresDir, "sonata.ly"), "\\score { { c4 } }");

		const loader = lilypondLoader({ base: pathToFileURL(`${scoresDir}/`) });
		const { context, store } = createFakeContext({ root, publicDir });
		await loader.load(context);

		expect(store.keys()).toEqual(["sonata"]);
	});

	it("accepts a base string that already ends with a trailing slash", async () => {
		await writeFile(join(scoresDir, "sonata.ly"), "\\score { { c4 } }");

		const loader = lilypondLoader({ base: "./src/scores/" });
		const { context, store } = createFakeContext({ root, publicDir });
		await loader.load(context);

		expect(store.keys()).toEqual(["sonata"]);
	});

	it("reflects the updated source when a file changes between load()s", async () => {
		const filePath = join(scoresDir, "sonata.ly");
		await writeFile(filePath, "\\score { { c4 } }");

		const loader = lilypondLoader({ base: "./src/scores" });
		const { context, store } = createFakeContext({ root, publicDir });

		await loader.load(context);
		expect(store.get("sonata")?.data.source).toContain("c4");

		await writeFile(filePath, "\\score { { d4 } }");
		await loader.load(context);
		expect(store.get("sonata")?.data.source).toContain("d4");
	});

	it("removes an entry for a file deleted between load()s", async () => {
		const filePath = join(scoresDir, "sonata.ly");
		await writeFile(filePath, "\\score { { c4 } }");

		const loader = lilypondLoader({ base: "./src/scores" });
		const { context, store } = createFakeContext({ root, publicDir });

		await loader.load(context);
		expect(store.keys()).toEqual(["sonata"]);

		await rm(filePath);
		await loader.load(context);
		expect(store.keys()).toEqual([]);
	});

	it("keeps a previously-synced entry when its file transiently fails to read on a later sync", async () => {
		const filePath = join(scoresDir, "sonata.ly");
		await writeFile(
			filePath,
			'\\header { title = "Sonata" } \\score { { c4 } }',
		);

		const loader = lilypondLoader({ base: "./src/scores" });
		const { context, store } = createFakeContext({ root, publicDir });

		await loader.load(context);
		const originalEntry = store.get("sonata");
		expect(originalEntry).toBeDefined();

		// Simulate a transient read failure (e.g. an editor's atomic save
		// racing the sync) by swapping the file for a directory of the same
		// name — `readFile` on it throws EISDIR — while it still matches the
		// glob pattern.
		await rm(filePath);
		await mkdir(filePath);

		await loader.load(context);
		expect(store.get("sonata")).toEqual(originalEntry);

		await rm(filePath, { recursive: true });
		await writeFile(
			filePath,
			'\\header { title = "Sonata" } \\score { { c4 } }',
		);
		await loader.load(context);
		expect(store.get("sonata")).toBeDefined();
	});

	it("sweeps a stored entry with no filePath (e.g. a virtual entry), instead of trying to match it", async () => {
		await writeFile(join(scoresDir, "sonata.ly"), "\\score { { c4 } }");

		const store = createFakeStore();
		store.set({ id: "orphan", data: {}, digest: "x" } as never);

		const loader = lilypondLoader({ base: "./src/scores" });
		const { context } = createFakeContext({ root, publicDir, store });
		await loader.load(context);

		expect(store.get("orphan")).toBeUndefined();
		expect(store.get("sonata")).toBeDefined();
	});

	it("does not crash when a file fails to read and has no previously-synced entry to fall back to", async () => {
		await mkdir(join(scoresDir, "broken.ly"));

		const loader = lilypondLoader({ base: "./src/scores" });
		const { context, store, logger } = createFakeContext({ root, publicDir });
		await loader.load(context);

		expect(store.keys()).toEqual([]);
		expect(logger.error).toHaveBeenCalledWith(
			expect.stringContaining("Error reading broken.ly"),
		);
	});

	it("re-syncs when the watcher reports a change under base", async () => {
		const filePath = join(scoresDir, "sonata.ly");
		await writeFile(filePath, "\\score { { c4 } }");

		const loader = lilypondLoader({ base: "./src/scores" });
		const watcher = createFakeWatcher();
		const { context, store } = createFakeContext({ root, publicDir, watcher });

		await loader.load(context);
		expect(watcher.add).toHaveBeenCalledWith(`${scoresDir}/`);
		expect(store.get("sonata")?.data.source).toContain("c4");

		await writeFile(filePath, "\\score { { e4 } }");
		watcher.emit("change", filePath);
		// runSync() inside the watcher handler is fire-and-forget (queued), so
		// give its microtask/IO chain a turn to complete before asserting.
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(store.get("sonata")?.data.source).toContain("e4");
	});

	it("ignores a watcher event for a path outside base", async () => {
		const filePath = join(scoresDir, "sonata.ly");
		await writeFile(filePath, "\\score { { c4 } }");

		const loader = lilypondLoader({ base: "./src/scores" });
		const watcher = createFakeWatcher();
		const { context, store } = createFakeContext({ root, publicDir, watcher });

		await loader.load(context);
		expect(store.get("sonata")?.data.source).toContain("c4");

		await writeFile(filePath, "\\score { { e4 } }");
		watcher.emit("change", join(root, "unrelated.txt"));
		// runSync() inside the watcher handler is fire-and-forget (queued), so
		// give its microtask/IO chain a turn to complete before asserting.
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(store.get("sonata")?.data.source).toContain("c4");
	});

	it("keeps the full filename as the id when a custom pattern matches a non-lilypond extension", async () => {
		await writeFile(join(scoresDir, "notes.txt"), "\\score { { c4 } }");

		const loader = lilypondLoader({
			base: "./src/scores",
			pattern: "**/*.txt",
		});
		const { context, store } = createFakeContext({ root, publicDir });
		await loader.load(context);

		expect(store.keys()).toEqual(["notes.txt"]);
	});

	it("logs and swallows an error from a watcher-triggered re-sync, instead of crashing the queue", async () => {
		const filePath = join(scoresDir, "sonata.ly");
		await writeFile(filePath, "\\score { { c4 } }");

		const loader = lilypondLoader({ base: "./src/scores" });
		const watcher = createFakeWatcher();
		let syncCount = 0;
		const { context, logger } = createFakeContext({
			root,
			publicDir,
			watcher,
			parseData: async ({ data }) => {
				syncCount++;
				if (syncCount > 1) throw new Error("boom");
				return data;
			},
		});

		await loader.load(context);
		watcher.emit("change", filePath);
		// runSync() inside the watcher handler is fire-and-forget (queued), so
		// give its microtask/IO chain a turn to complete before asserting.
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(logger.error).toHaveBeenCalledWith(
			expect.stringContaining("Reload failed: boom"),
		);
	});

	it("does not register watcher handlers when no watcher is provided (e.g. `astro build`)", async () => {
		await writeFile(join(scoresDir, "sonata.ly"), "\\score { { c4 } }");
		const loader = lilypondLoader({ base: "./src/scores" });
		const { context } = createFakeContext({ root, publicDir });
		await expect(loader.load(context)).resolves.toBeUndefined();
	});
});

describe("lilypondEntrySchema", () => {
	it("round-trips a full entry, including extra header fields", () => {
		const parsed = lilypondEntrySchema.parse({
			source: "\\score { }",
			alt: "Sonata, by Beethoven",
			sourceName: "sonata.ly",
			includePaths: [],
			assetTitle: "sonata",
			meta: {
				title: "Sonata",
				composer: "Beethoven",
				mutopiacomposer: "BeethovenLV",
			},
		});
		expect(parsed.meta.title).toBe("Sonata");
		expect(parsed.meta.mutopiacomposer).toBe("BeethovenLV");
		expect(parsed.source).toBe("\\score { }");
	});

	it("accepts an entry with no header fields at all", () => {
		expect(() =>
			lilypondEntrySchema.parse({
				source: "\\score { }",
				alt: "",
				includePaths: [],
				assetTitle: "score",
				meta: {},
			}),
		).not.toThrow();
	});
});
