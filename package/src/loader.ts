import { glob, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Loader, LoaderContext } from "astro/loaders";
import { z } from "astro/zod";
import { pruneOrphanedAssets } from "./deleteAssets.js";
import { type LilypondContent, LY_EXTENSIONS } from "./index.js";
import type { PluginOptions } from "./plugins/index.js";
import { defaultOptions, render, resolveCrop } from "./render.js";
import {
	altTextFor,
	assetsUrlBaseFor,
	contentHashFor,
	includePathsFor,
	type KnownLyHeaderFields,
	parseLyHeaderFields,
	prependVersion,
	resolveDefaults,
	sourceNameFor,
	splitHeaderFields,
	titleFor,
} from "./utils/index.js";
import { writeAssets } from "./writeAsset.js";

const DEFAULT_PATTERN = `**/*.{${LY_EXTENSIONS.map((ext) => ext.slice(1)).join(",")}}`;

export interface GenerateIdOptions {
	/** The path to the entry file, relative to `base`. */
	entry: string;
	/** The base directory URL entries are resolved from. */
	base: URL;
	/** The entry's parsed `\header` fields (see `parseLyHeaderFields`). */
	header: Record<string, string>;
}

export interface LilypondLoaderOptions extends PluginOptions {
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
	 * Directory name, relative to Astro's `publicDir`, that rendered assets
	 * are written into. Exclusive to this collection — the loader prunes
	 * anything under it that isn't currently referenced by one of its own
	 * entries, so don't point two different collections (or the `lilypond()`
	 * integration's own `outputDir`) at the same directory.
	 * @default `"_lilypond-<collection name>"`
	 */
	outputDir?: string;
}

export interface LilypondHeaderData extends KnownLyHeaderFields {
	/** Header fields outside LilyPond's standard set (e.g. `mutopiacomposer`). */
	extra: Record<string, string>;
}

export interface LilypondCollectionEntry
	extends LilypondContent,
		LilypondHeaderData {}

export const lilypondEntrySchema = z.object({
	pages: z.array(
		z.object({
			src: z.string(),
			width: z.number().optional(),
			height: z.number().optional(),
		}),
	),
	alt: z.string().optional(),
	dedication: z.string().optional(),
	title: z.string().optional(),
	subtitle: z.string().optional(),
	subsubtitle: z.string().optional(),
	instrument: z.string().optional(),
	poet: z.string().optional(),
	composer: z.string().optional(),
	meter: z.string().optional(),
	arranger: z.string().optional(),
	piece: z.string().optional(),
	opus: z.string().optional(),
	copyright: z.string().optional(),
	tagline: z.string().optional(),
	extra: z.record(z.string(), z.string()),
});

function stripLyExtension(entryPath: string): string {
	for (const ext of LY_EXTENSIONS) {
		if (entryPath.endsWith(ext)) return entryPath.slice(0, -ext.length);
	}
	return entryPath;
}

function defaultGenerateId({ entry }: GenerateIdOptions): string {
	return stripLyExtension(entry.split(sep).join("/"));
}

function resolveBaseUrl(base: string | URL, root: URL): URL {
	if (base instanceof URL) return base;
	const withTrailingSlash = base.endsWith("/") ? base : `${base}/`;
	return new URL(withTrailingSlash, root);
}

function posixRelative(from: string, to: string): string {
	return relative(from, to).split(sep).join("/");
}

function fileNameFromUrl(url: string): string {
	return url.slice(url.lastIndexOf("/") + 1);
}

/**
 * Astro Content Layer loader that turns a directory of `.ly`/`.ily` files
 * into a content collection.
 */
export function lilypondLoader(options: LilypondLoaderOptions): Loader {
	const {
		pattern = DEFAULT_PATTERN,
		base,
		generateId = defaultGenerateId,
		format,
		defaults,
		timeout,
		outputDir,
	} = options;

	return {
		name: "astro-lilypond-loader",
		schema: lilypondEntrySchema,
		async load(context: LoaderContext): Promise<void> {
			const {
				config,
				collection,
				store,
				logger,
				watcher,
				generateDigest,
				parseData,
			} = context;

			const outputDirName = outputDir ?? `_lilypond-${collection}`;
			const assetsDir = join(fileURLToPath(config.publicDir), outputDirName);
			const assetsUrlBase = assetsUrlBaseFor(config.base, outputDirName);
			const rootDir = fileURLToPath(config.root);
			const baseUrl = resolveBaseUrl(base, config.root);
			const baseDir = fileURLToPath(baseUrl);

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
				// Deliberately not short-circuited on a matching stored digest:
				// unlike a rendered-markdown digest, that would only tell us the
				// *source* hasn't changed, not that the previously-written asset
				// file is still on disk (it could be gone — output dir cleaned,
				// or a fresh checkout reusing a persisted content store cache).
				// `writeAssets()` below already does the real, disk-backed cache
				// check (does the content-hashed file exist?) and skips the
				// `lilypond` invocation itself when it does — this just always
				// pays the cheap cost of getting there.
				const digest = generateDigest(source);

				const resolved = resolveDefaults(defaults);
				const crop = resolveCrop(resolved.crop, "component");
				const src = prependVersion(source, resolved.version);
				const resolvedFormat = format ?? defaultOptions.format;
				const includePaths = includePathsFor(filePath);
				const sourceName = sourceNameFor(filePath);
				const title = titleFor(sourceName);
				const hash = contentHashFor({
					source: src,
					format: resolvedFormat,
					resolution: resolved.resolution,
					crop,
				});

				const assets = await writeAssets({
					hash,
					title,
					format: resolvedFormat,
					outputDir: assetsDir,
					urlBase: assetsUrlBase,
					sizeScale: crop ? resolved.cropScale : 1,
					getBuffers: () =>
						render(src, {
							format: resolvedFormat,
							crop,
							defaults,
							timeout,
							includePaths,
							sourceName,
						}),
				});

				const data = await parseData({
					id,
					data: {
						pages: assets.map((asset) => ({
							src: asset.url,
							width: asset.width,
							height: asset.height,
						})),
						alt: altTextFor({
							title: headerFields.title,
							composer: headerFields.composer,
						}),
						...splitHeaderFields(headerFields),
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
				const entries: string[] = [];
				for await (const entry of glob(pattern, { cwd: baseDir })) {
					entries.push(entry);
				}
				if (entries.length === 0) {
					logger.warn(
						`astro-lilypond: no files matched "${pattern}" in "${baseDir}"`,
					);
				}
				const ids = await Promise.all(entries.map((entry) => syncEntry(entry)));
				for (const id of ids) if (id) untouched.delete(id);
				for (const id of untouched) store.delete(id);

				// Sweep the directory against every currently-stored entry's pages
				// (not just the ones touched this pass), so a removed/renamed
				// source's leftover files get cleaned up without needing separate
				// per-entry bookkeeping.
				const referenced = new Set<string>();
				for (const stored of store.values()) {
					const pages = (stored.data as { pages?: { src: string }[] }).pages;
					for (const page of pages ?? [])
						referenced.add(fileNameFromUrl(page.src));
				}
				await pruneOrphanedAssets({ dir: assetsDir, referenced, logger });
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
