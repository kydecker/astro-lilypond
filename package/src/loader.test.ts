import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { DataEntry } from "astro/loaders";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./render.js", () => ({
	render: vi.fn().mockResolvedValue([Buffer.from("<svg></svg>")]),
	FORMATS: ["png", "svg"],
	resolveCrop: (cropSetting: unknown, context: "markdown" | "component") =>
		context === "markdown" ? cropSetting !== false : cropSetting === true,
	defaultOptions: {
		format: "svg",
		crop: true,
		binaryPath: "lilypond",
		timeout: 60_000,
		defaults: {
			version: "2.26.0",
			resolution: 144,
			crop: "markdown-only",
			cropScale: 1.5,
		},
	},
}));

vi.mock("./utils/emitLilypondAsset.js", () => ({
	emitLilypondAsset: vi.fn(),
}));

vi.mock("./binary/index.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./binary/index.js")>();
	return {
		...actual,
		resolveLilypondBinary: vi.fn().mockResolvedValue("lilypond"),
	};
});

import { resolveLilypondBinary } from "./binary/index.js";
import { lilypondEntrySchema, lilypondLoader } from "./loader.js";
import { render } from "./render.js";
import { fakeEmitLilypondAsset } from "./utils/emitLilypondAsset.fake.js";
import { emitLilypondAsset } from "./utils/emitLilypondAsset.js";

const mockRender = vi.mocked(render);
const mockEmitLilypondAsset = vi.mocked(emitLilypondAsset);
const mockResolveLilypondBinary = vi.mocked(resolveLilypondBinary);

/** Minimal in-memory stand-in for Astro's content-layer DataStore. */
function createFakeStore() {
	const data = new Map<string, DataEntry>();
	return {
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
			parseData: async ({ data }: { data: Record<string, unknown> }) => data,
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
	mockRender.mockClear();
	mockRender.mockResolvedValue([Buffer.from("<svg></svg>")]);
	mockEmitLilypondAsset.mockReset();
	fakeEmitLilypondAsset(mockEmitLilypondAsset);
	mockResolveLilypondBinary.mockReset().mockResolvedValue("lilypond");
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

describe("lilypondLoader", () => {
	it("populates the store with pages/alt/header for each matched file", async () => {
		await writeFile(
			join(scoresDir, "sonata.ly"),
			'\\header { title = "Sonata" composer = "Beethoven" mutopiacomposer = "BeethovenLV" }',
		);

		const loader = lilypondLoader({ base: "./src/scores" });
		const { context, store } = createFakeContext({ root, publicDir });
		await loader.load(context);

		const entry = store.get("sonata");
		expect(entry?.data).toMatchObject({
			pages: [{ src: "/_astro/sonata.svg" }],
			alt: "Sonata, by Beethoven",
			title: "Sonata",
			composer: "Beethoven",
			extra: { mutopiacomposer: "BeethovenLV" },
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

	it("calls emitLilypondAsset with the updated source when a file changes between load()s", async () => {
		const filePath = join(scoresDir, "sonata.ly");
		await writeFile(filePath, "\\score { { c4 } }");

		const loader = lilypondLoader({ base: "./src/scores" });
		const { context } = createFakeContext({ root, publicDir });

		await loader.load(context);
		expect(mockEmitLilypondAsset).toHaveBeenLastCalledWith(
			expect.objectContaining({ source: expect.stringContaining("c4") }),
		);

		await writeFile(filePath, "\\score { { d4 } }");
		await loader.load(context);
		expect(mockEmitLilypondAsset).toHaveBeenLastCalledWith(
			expect.objectContaining({ source: expect.stringContaining("d4") }),
		);
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

	it("re-syncs when the watcher reports a change under base", async () => {
		const filePath = join(scoresDir, "sonata.ly");
		await writeFile(filePath, "\\score { { c4 } }");

		const loader = lilypondLoader({ base: "./src/scores" });
		const watcher = createFakeWatcher();
		const { context } = createFakeContext({ root, publicDir, watcher });

		await loader.load(context);
		expect(mockRender).toHaveBeenCalledTimes(1);
		expect(watcher.add).toHaveBeenCalledWith(`${scoresDir}/`);

		await writeFile(filePath, "\\score { { e4 } }");
		watcher.emit("change", filePath);
		// runSync() inside the watcher handler is fire-and-forget (queued), so
		// give its microtask/IO chain a turn to complete before asserting.
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(mockRender).toHaveBeenCalledTimes(2);
	});

	it("does not register watcher handlers when no watcher is provided (e.g. `astro build`)", async () => {
		await writeFile(join(scoresDir, "sonata.ly"), "\\score { { c4 } }");
		const loader = lilypondLoader({ base: "./src/scores" });
		const { context } = createFakeContext({ root, publicDir });
		await expect(loader.load(context)).resolves.toBeUndefined();
	});

	it("resolves its own binary and threads it through to render()", async () => {
		mockResolveLilypondBinary.mockResolvedValue(
			"/cache/lilypond-2.26.0/bin/lilypond",
		);
		await writeFile(join(scoresDir, "sonata.ly"), "\\score { { c4 } }");

		const loader = lilypondLoader({
			base: "./src/scores",
			autoInstall: { version: "2.26.0" },
		});
		const { context } = createFakeContext({ root, publicDir });
		await loader.load(context);

		expect(mockResolveLilypondBinary).toHaveBeenCalledWith(
			expect.objectContaining({ version: "2.26.0", autoInstall: true }),
		);
		expect(mockRender).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				binaryPath: "/cache/lilypond-2.26.0/bin/lilypond",
			}),
		);
	});
});

describe("lilypondEntrySchema", () => {
	it("round-trips a full entry, including extra header fields", () => {
		const parsed = lilypondEntrySchema.parse({
			pages: [{ src: "/_astro/sonata.abc123.svg", width: 100, height: 50 }],
			alt: "Sonata, by Beethoven",
			title: "Sonata",
			composer: "Beethoven",
			extra: { mutopiacomposer: "BeethovenLV" },
		});
		expect(parsed.title).toBe("Sonata");
		expect(parsed.extra).toEqual({ mutopiacomposer: "BeethovenLV" });
	});

	it("accepts an entry with no header fields at all", () => {
		expect(() =>
			lilypondEntrySchema.parse({
				pages: [{ src: "/_astro/abc123.score.svg" }],
				extra: {},
			}),
		).not.toThrow();
	});
});
