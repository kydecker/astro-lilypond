import { execFile } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { AstroIntegration } from "astro";
import type { Plugin } from "vite";
import { DEV_ASSETS_DIR_ENV } from "./devAssetsEnvVar.js";
import {
	type PluginOptions,
	type ResolvedPluginOptions,
	rehypePlugin,
	remarkPlugin,
	satteriPlugin,
} from "./plugins/index.js";
import { pruneOrphanedAssets } from "./pruneOrphanedAssets.js";
import { defaultOptions, render } from "./render.js";
import {
	assetsUrlBaseFor,
	contentHashFor,
	imgTag,
	includePathsFor,
	prependVersion,
	sourceNameFor,
	titleFor,
} from "./utils/index.js";
import { writeAsset } from "./writeAsset.js";

const execFileAsync = promisify(execFile);

const LY_EXTENSIONS = [".ly", ".lilypond", ".ily"] as const;

export type { PluginOptions as LilypondPluginOptions };

export interface LilypondOptions extends PluginOptions {
	/**
	 * LilyPond version string to prepend automatically to every block that
	 * doesn't already declare `\version`. Example: `"2.24.0"`.
	 *
	 * When omitted, blocks must include `\version` themselves.
	 */
	version?: string;

	/**
	 * Output format to be written to a file under `outputDir`.
	 * @default "svg"
	 */
	format?: "svg" | "png";

	/**
	 * Resolution in DPI. Only applies when "format" is "png".
	 * @default 144
	 */
	resolution?: number;

	/**
	 * Crop the output tightly to the content bounding box.
	 * @default true
	 */
	crop?: boolean;

	/**
	 * Milliseconds to wait for a single `lilypond` invocation before
	 * aborting it.
	 * @default 60000
	 */
	timeout?: number;

	/**
	 * Directory name, relative to Astro's `publicDir`, that rendered assets
	 * are written into by `astro build`. Filenames are content-addressed, so
	 * unchanged scores are reused across builds instead of being re-rendered,
	 * and it's safe to commit this directory if you'd like faster rebuilds.
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
			if (!LY_EXTENSIONS.some((ext) => id.endsWith(ext))) return;
			const src = options.version
				? prependVersion(source, options.version)
				: source;
			const format = options.format ?? defaultOptions.format;
			const resolution = options.resolution ?? defaultOptions.resolution;
			const crop = options.crop ?? defaultOptions.crop;
			const includePaths = includePathsFor(id);
			const sourceName = sourceNameFor(id);
			const title = titleFor(sourceName);
			const hash = contentHashFor({ source: src, format, resolution, crop });
			const url = await writeAsset({
				hash,
				title,
				format,
				outputDir: options.assetsDir,
				urlBase: options.assetsUrlBase,
				trackAsset: options.trackAsset,
				getBuffer: () =>
					render(src, {
						format,
						resolution: options.resolution,
						crop: options.crop,
						timeout: options.timeout,
						includePaths,
						sourceName,
					}),
			});
			return {
				code: `export default ${JSON.stringify(imgTag(url))}`,
			};
		},
	};
}

export default function lilypond(
	options: LilypondOptions = {},
): AstroIntegration {
	const referencedAssets = new Set<string>();
	let assetsDir: string | undefined;

	return {
		name: "astro-lilypond",
		hooks: {
			"astro:config:setup": async ({
				command,
				config,
				updateConfig,
				injectRoute,
				logger,
			}) => {
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

				const isBuild = command === "build";
				assetsDir = isBuild
					? join(fileURLToPath(config.publicDir), outputDirName)
					: join(
							fileURLToPath(config.cacheDir),
							"astro-lilypond",
							outputDirName,
						);

				const resolvedOptions: ResolvedPluginOptions = {
					...options,
					assetsDir,
					assetsUrlBase,
					trackAsset: (fileName) => referencedAssets.add(fileName),
				};

				updateConfig({
					vite: { plugins: [lyFilePlugin(resolvedOptions)] },
				});

				if (!isBuild) {
					process.env[DEV_ASSETS_DIR_ENV] = assetsDir;
					injectRoute({
						pattern: `/${outputDirName}/[fileName]`,
						entrypoint: new URL("./devAssetEndpoint.js", import.meta.url),
						prerender: false,
					});
				}

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
					content: LY_EXTENSIONS.map(
						(ext) =>
							`declare module "*${ext}" {\n  const html: string;\n  export default html;\n}`,
					).join("\n"),
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
