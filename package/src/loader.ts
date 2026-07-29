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
import { type LilypondContent, LY_EXTENSIONS } from "./index.js";
import type { PluginOptions } from "./plugins/index.js";
import { defaultOptions, render, resolveCrop } from "./render.js";
import {
	altTextFor,
	emitLilypondAsset,
	includePathsFor,
	type KnownLyHeaderFields,
	parseLyHeaderFields,
	prependVersion,
	resolveDefaults,
	sourceNameFor,
	splitHeaderFields,
	titleFor,
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
	 * When no `lilypond` binary is found on `PATH`, download a matching
	 * prebuilt release into a local cache and use that instead. Set to
	 * `false` to only ever use a `PATH` install, or pass an object to pick
	 * which version gets downloaded.
	 * @default true
	 */
	autoInstall?: boolean | AutoInstallOptions;
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
		format,
		defaults,
		timeout,
		autoInstall,
	} = options;

	const resolved = resolveDefaults(defaults);
	const crop = resolveCrop(resolved.crop, "component");
	const resolvedFormat = format ?? defaultOptions.format;

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
				const title = titleFor(sourceName);

				const pages = await emitLilypondAsset({
					title,
					format: resolvedFormat,
					source: src,
					resolution: resolved.resolution,
					crop,
					sizeScale: crop ? resolved.cropScale : 1,
					binaryPath,
					render: () =>
						render(src, {
							format: resolvedFormat,
							crop,
							defaults,
							timeout,
							binaryPath,
							includePaths,
							sourceName,
						}),
				});

				const data = await parseData({
					id,
					data: {
						pages,
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
