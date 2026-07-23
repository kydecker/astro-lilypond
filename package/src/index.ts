import { execFile } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { AstroIntegration } from "astro";
import type { Plugin } from "vite";
import { pruneOrphanedAssets, pruneStaleAssets } from "./deleteAssets.js";
import {
	type PluginOptions,
	type ResolvedPluginOptions,
	rehypePlugin,
	remarkPlugin,
	satteriPlugin,
} from "./plugins/index.js";
import {
	defaultOptions,
	type LilypondDefaults,
	render,
	resolveCrop,
} from "./render.js";
import {
	altTextFor,
	assetsUrlBaseFor,
	contentHashFor,
	includePathsFor,
	lyTypeDeclarationsFor,
	parseLyHeader,
	parseLyImportQuery,
	prependVersion,
	RECOGNIZED_QUERY_PARAMS,
	resolveDefaults,
	sourceNameFor,
	titleFor,
} from "./utils/index.js";
import { writeAssets } from "./writeAsset.js";

const execFileAsync = promisify(execFile);

const LY_EXTENSIONS = [".ly", ".lilypond", ".ily"] as const;

export type { LilypondDefaults, PluginOptions as LilypondPluginOptions };

export interface LilypondPage {
	src: string;
	width?: number;
	height?: number;
}

export interface LilypondContent {
	pages: LilypondPage[];
	alt?: string;
}

export interface LilypondOptions extends PluginOptions {
	/**
	 * Output format to be written to a file under `outputDir`.
	 * @default "svg"
	 */
	format?: "svg" | "png";

	/**
	 * Defaults passed to each score.
	 * Defaults can still be overridden by individual `.ly` files.
	 */
	defaults?: LilypondDefaults;

	/**
	 * Milliseconds to wait for a single `lilypond` invocation before
	 * aborting it.
	 * @default 60000
	 */
	timeout?: number;

	/**
	 * Directory name, relative to Astro's `publicDir`, that rendered assets
	 * are written into by both `astro dev` and `astro build`. Filenames are
	 * content-addressed, so unchanged scores are reused instead of being
	 * re-rendered, and it's safe to commit this directory if you'd like
	 * faster rebuilds.
	 *
	 * @default "_lilypond"
	 */
	outputDir?: string;
}

function lyFilePlugin(options: ResolvedPluginOptions): Plugin {
	return {
		name: "vite-plugin-astro-lilypond-ly",
		enforce: "pre",
		async transform(source, id) {
			const query = parseLyImportQuery(id);
			if (!query) return;
			const { pathname, cropOverride } = query;
			if (!LY_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return;

			const {
				version,
				resolution,
				crop: cropSetting,
				cropScale,
			} = resolveDefaults(options.defaults);
			const crop = cropOverride ?? resolveCrop(cropSetting, "component");
			const src = version ? prependVersion(source, version) : source;
			const format = options.format ?? defaultOptions.format;
			const includePaths = includePathsFor(pathname);
			const sourceName = sourceNameFor(pathname);
			const title = titleFor(sourceName);
			const hash = contentHashFor({ source: src, format, resolution, crop });
			const alt = altTextFor(parseLyHeader(source));
			const assets = await writeAssets({
				hash,
				title,
				format,
				outputDir: options.assetsDir,
				urlBase: options.assetsUrlBase,
				sizeScale: crop ? cropScale : 1,
				trackAsset: options.trackAsset,
				getBuffers: () =>
					render(src, {
						format,
						crop,
						defaults: options.defaults,
						timeout: options.timeout,
						includePaths,
						sourceName,
					}),
			});
			// Keyed by the full id (including query) so `./score.ly` and
			// `./score.ly?crop` are tracked as independent sources.
			await options.pruneStaleAssets(
				id,
				assets.map((asset) => asset.fileName),
			);
			const content: LilypondContent = {
				pages: assets.map((asset) => ({
					src: asset.url,
					width: asset.width,
					height: asset.height,
				})),
				alt,
			};
			return {
				code: `export default ${JSON.stringify(content)}`,
			};
		},
	};
}

export default function lilypond(
	options: LilypondOptions = {},
): AstroIntegration {
	const referencedAssets = new Set<string>();
	const assetsBySource = new Map<string, Set<string>>();
	let assetsDir: string | undefined;

	return {
		name: "astro-lilypond",
		hooks: {
			"astro:config:setup": async ({ config, updateConfig, logger }) => {
				await execFileAsync("lilypond", ["--version"]).catch(
					(err: NodeJS.ErrnoException) => {
						if (err.code === "ENOENT") {
							logger?.warn(
								"astro-lilypond: `lilypond` binary not found — LilyPond blocks will render as errors. Install LilyPond and ensure it is on PATH.",
							);
						}
					},
				);

				const outputDirName = options.outputDir ?? "_lilypond";
				const assetsUrlBase = assetsUrlBaseFor(config.base, outputDirName);

				const resolvedAssetsDir = join(
					fileURLToPath(config.publicDir),
					outputDirName,
				);
				assetsDir = resolvedAssetsDir;

				const resolvedOptions: ResolvedPluginOptions = {
					...options,
					assetsDir,
					assetsUrlBase,
					trackAsset: (fileName) => referencedAssets.add(fileName),
					pruneStaleAssets: (sourceKey, fileNames) =>
						pruneStaleAssets({
							assetsBySource,
							sourceKey,
							fileNames,
							outputDir: resolvedAssetsDir,
							logger,
						}),
				};

				updateConfig({
					vite: { plugins: [lyFilePlugin(resolvedOptions)] },
				});

				const existingProcessor = config.markdown?.processor;

				if (existingProcessor?.name === "satteri") {
					const { satteri, isSatteriProcessor } = await import(
						"@astrojs/markdown-satteri"
					);

					if (!isSatteriProcessor(existingProcessor)) {
						throw new Error(
							"astro-lilypond: the active markdown processor reports the name " +
								'"satteri" but failed the isSatteriProcessor check.',
						);
					}

					const existingOptions = existingProcessor.options ?? {};
					updateConfig({
						markdown: {
							processor: satteri({
								...existingOptions,
								mdastPlugins: [
									...(existingOptions.mdastPlugins ?? []),
									satteriPlugin(resolvedOptions),
								],
							}),
						},
					});
					logger?.info("astro-lilypond: registered Sätteri mdast plugin");
					return;
				}

				if (existingProcessor?.name === "unified") {
					const { unified, isUnifiedProcessor } = await import(
						"@astrojs/markdown-remark"
					);

					if (!isUnifiedProcessor(existingProcessor)) {
						throw new Error(
							"astro-lilypond: the active markdown processor reports the name " +
								'"unified" but failed the isUnifiedProcessor check.',
						);
					}

					const existingOptions = existingProcessor.options ?? {};
					updateConfig({
						markdown: {
							processor: unified({
								...existingOptions,
								remarkPlugins: [
									...(existingOptions.remarkPlugins ?? []),
									[remarkPlugin, resolvedOptions],
								],
								rehypePlugins: [
									...(existingOptions.rehypePlugins ?? []),
									[rehypePlugin, resolvedOptions],
								],
							}),
						},
					});
					logger?.info(
						"astro-lilypond: registered unified remark/rehype plugins",
					);
					return;
				}

				throw new Error(
					"astro-lilypond requires a processor-based Astro markdown config. " +
						"Set `markdown.processor` to `satteri(…)` (Astro 7 default) or " +
						"`unified(…)` from `@astrojs/markdown-remark`, then add this integration. " +
						`Detected processor: ${existingProcessor?.name ?? "none"}.`,
				);
			},

			"astro:config:done": ({ injectTypes }) => {
				injectTypes({
					filename: "ly-types.d.ts",
					content: lyTypeDeclarationsFor(
						LY_EXTENSIONS,
						RECOGNIZED_QUERY_PARAMS,
					),
				});
			},

			"astro:build:done": async ({ logger }) => {
				if (!assetsDir) return;
				await pruneOrphanedAssets({
					dir: assetsDir,
					referenced: referencedAssets,
					logger,
				});
			},
		},
	};
}
