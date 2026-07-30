import { glob, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Loader, LoaderContext } from "astro/loaders";
import { z } from "astro/zod";
import {
	type AutoInstallOptions,
	resolveAutoInstallOption,
	resolveLilypondBinary,
} from "./binary/index.js";
import { type LilypondScore, LY_EXTENSIONS } from "./index.js";
import type { LilypondDefaults } from "./render.js";
import { setRenderState } from "./renderState.js";
import {
	altTextFor,
	includePathsFor,
	parseLyHeaderFields,
	prependVersion,
	resolveDefaults,
	sourceNameFor,
	titleFor,
	toLilypondMetadata,
} from "./utils/index.js";

const DEFAULT_PATTERN = `**/*.{${LY_EXTENSIONS.map((ext) => ext.slice(1)).join(",")}}`;

export interface GenerateIdOptions {
	/** The path to the entry file, relative to `base`. */
	entry: string;
	/** The base directory URL entries are resolved from. */
	base: URL;
	/** The entry's parsed `\header` fields (see `parseLyHeaderFields`). */
	header: Record<string, string>;
}

export interface LilypondLoaderOptions {
	/**
	 * Glob pattern(s) matching score files, relative to `base`.
	 * @default "**\/*.{ly,ily,lilypond}"
	 */
	pattern?: string | string[];

	/**
	 * Base directory the pattern resolves from — relative to the project
	 * root, or an absolute file URL.
	 */
	base: string | URL;

	/**
	 * Generates an entry's collection id.
	 * @default the file's path relative to `base`, POSIX-separated, with its extension stripped.
	 */
	generateId?: (options: GenerateIdOptions) => string;

	/**
	 * Defaults used when `render()` is later called on one of this
	 * collection's entries.
	 */
	defaults?: LilypondDefaults;

	/**
	 * Milliseconds to wait for a single `lilypond` invocation before
	 * aborting it, when `render()` is later called on one of this
	 * collection's entries.
	 * @default 60000
	 */
	timeout?: number;

	/**
	 * When no `lilypond` binary is found on `PATH`, download a matching
	 * prebuilt release into a local cache and use that instead. Set to
	 * `false` to only ever use a `PATH` install, or pass an object to pick
	 * which version gets downloaded.
	 * @default true
	 */
	autoInstall?: boolean | AutoInstallOptions;
}

/**
 * A collection entry is itself a `LilypondScore` (its `meta` carries the
 * file's `\header` fields) — pass `entry.data` directly to the exported
 * `render()`, exactly as you would a plain `.ly` import.
 */
export type LilypondCollectionEntry = LilypondScore;

// `.catchall()` lets any other header field (e.g. `mutopiacomposer`) sit
// alongside the standard ones, typed as `string` — matching `LilypondMetadata`'s
// index signature.
const lilypondMetadataSchema = z
	.object({
		arranger: z.string().optional(),
		composer: z.string().optional(),
		copyright: z.string().optional(),
		dedication: z.string().optional(),
		instrument: z.string().optional(),
		meter: z.string().optional(),
		opus: z.string().optional(),
		piece: z.string().optional(),
		poet: z.string().optional(),
		subsubtitle: z.string().optional(),
		subtitle: z.string().optional(),
		tagline: z.string().optional(),
		title: z.string().optional(),
	})
	.catchall(z.string());

export const lilypondEntrySchema = z.object({
	source: z.string(),
	alt: z.string(),
	sourceName: z.string().optional(),
	includePaths: z.array(z.string()),
	assetTitle: z.string(),
	meta: lilypondMetadataSchema,
});

function stripLyExtension(entryPath: string): string {
	for (const ext of LY_EXTENSIONS) {
		if (entryPath.endsWith(ext)) return entryPath.slice(0, -ext.length);
	}
	return entryPath;
}

function toPosixPath(path: string): string {
	return path.split(sep).join("/");
}

function defaultGenerateId({ entry }: GenerateIdOptions): string {
	return stripLyExtension(toPosixPath(entry));
}

function resolveBaseUrl(base: string | URL, root: URL): URL {
	if (base instanceof URL) return base;
	const withTrailingSlash = base.endsWith("/") ? base : `${base}/`;
	return new URL(withTrailingSlash, root);
}

function posixRelative(from: string, to: string): string {
	return toPosixPath(relative(from, to));
}

/**
 * Content Loader to turn a directory of `.ly` files into a content collection.
 */
export function lilypondLoader(options: LilypondLoaderOptions): Loader {
	const {
		pattern = DEFAULT_PATTERN,
		base,
		generateId = defaultGenerateId,
		defaults,
		timeout,
		autoInstall,
	} = options;

	const resolved = resolveDefaults(defaults);

	return {
		name: "astro-lilypond-loader",
		schema: lilypondEntrySchema,
		async load(context: LoaderContext): Promise<void> {
			const { config, store, logger, watcher, generateDigest, parseData } =
				context;

			const rootDir = fileURLToPath(config.root);
			const baseUrl = resolveBaseUrl(base, config.root);
			const baseDir = fileURLToPath(baseUrl);
			const binaryPath = await resolveLilypondBinary({
				...resolveAutoInstallOption(autoInstall),
				log: (message) => logger.info(message),
				warn: (message) => logger.warn(message),
			});
			// Populates the shared render() state, so this collection's entries
			// can be rendered even when the `lilypond()` integration itself
			// isn't registered.
			setRenderState({ binaryPath, defaults, timeout });

			async function syncEntry(entry: string): Promise<string | undefined> {
				const filePath = join(baseDir, entry);
				let source: string;
				try {
					source = await readFile(filePath, "utf8");
				} catch (err) {
					logger.error(
						`astro-lilypond: error reading ${entry}: ${(err as Error).message}`,
					);
					return undefined;
				}

				const headerFields = parseLyHeaderFields(source);
				const id = generateId({ entry, base: baseUrl, header: headerFields });
				const digest = generateDigest(source);

				const src = prependVersion(source, resolved.version);
				const includePaths = includePathsFor(filePath);
				const sourceName = sourceNameFor(filePath);
				const assetTitle = titleFor(sourceName);
				const meta = toLilypondMetadata(headerFields);
				const alt = altTextFor(meta);

				const data = await parseData({
					id,
					data: {
						source: src,
						alt,
						sourceName,
						includePaths,
						assetTitle,
						meta,
					},
					filePath,
				});

				store.set({
					id,
					data,
					filePath: posixRelative(rootDir, filePath),
					digest,
				});
				return id;
			}

			async function runSync(): Promise<void> {
				const untouched = new Set(store.keys());
				const idByPath = new Map<string, string>();
				for (const stored of store.values()) {
					if (stored.filePath) idByPath.set(stored.filePath, stored.id);
				}
				const entries: string[] = [];
				for await (const entry of glob(pattern, { cwd: baseDir })) {
					entries.push(entry);
				}
				if (entries.length === 0) {
					logger.warn(
						`astro-lilypond: no files matched "${pattern}" in "${baseDir}"`,
					);
				}
				const results = await Promise.all(
					entries.map(async (entry) => ({ entry, id: await syncEntry(entry) })),
				);
				for (const { entry, id } of results) {
					if (id) {
						untouched.delete(id);
						continue;
					}
					// syncEntry() failed (e.g. a transient read error racing an
					// editor's atomic save) — if this path previously synced
					// successfully, keep its existing entry rather than evicting
					// it; the next fs event will retry the read.
					const previousId = idByPath.get(
						posixRelative(rootDir, join(baseDir, entry)),
					);
					if (previousId) untouched.delete(previousId);
				}
				for (const id of untouched) store.delete(id);
			}

			await runSync();

			if (!watcher) return;
			watcher.add(baseDir);
			// Serializes re-syncs so overlapping fs events (e.g. an editor
			// autosave firing "change" twice) can't race on the shared store.
			let queue = Promise.resolve();
			const onFsEvent = (changedPath: string) => {
				if (!changedPath.startsWith(baseDir)) return;
				queue = queue.then(() =>
					runSync().catch((err) => {
						logger.error(
							`astro-lilypond: reload failed: ${(err as Error).message}`,
						);
					}),
				);
			};
			watcher.on("add", onFsEvent);
			watcher.on("change", onFsEvent);
			watcher.on("unlink", onFsEvent);
		},
	};
}
