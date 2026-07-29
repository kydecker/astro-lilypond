import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AstroIntegration } from "astro";
import emitAssetIntegration from "astro-emit-asset";
import type { Plugin } from "vite";
import {
	type PluginOptions,
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
	emitLilypondAsset,
	includePathsFor,
	type LilypondPage,
	lyTypeDeclarationsFor,
	parseLyHeader,
	parseLyImportQuery,
	prependVersion,
	RECOGNIZED_QUERY_PARAMS,
	resolveDefaults,
	sourceNameFor,
	titleFor,
} from "./utils/index.js";

const execFileAsync = promisify(execFile);

export const LY_EXTENSIONS = [".ly", ".lilypond", ".ily"] as const;

export type {
	LilypondDefaults,
	LilypondPage,
	PluginOptions as LilypondPluginOptions,
};

export interface LilypondContent {
	pages: LilypondPage[];
	alt?: string;
}

export interface LilypondOptions extends PluginOptions {
	/**
	 * Output format.
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
}

function lyFilePlugin(options: PluginOptions): Plugin {
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
			const alt = altTextFor(parseLyHeader(source));
			const pages = await emitLilypondAsset({
				title,
				format,
				source: src,
				resolution,
				crop,
				sizeScale: crop ? cropScale : 1,
				render: () =>
					render(src, {
						format,
						crop,
						defaults: options.defaults,
						timeout: options.timeout,
						includePaths,
						sourceName,
					}),
			});
			const content: LilypondContent = {
				pages,
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

				updateConfig({
					integrations: [emitAssetIntegration()],
					vite: { plugins: [lyFilePlugin(options)] },
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
									satteriPlugin(options),
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
									[remarkPlugin, options],
								],
								rehypePlugins: [
									...(existingOptions.rehypePlugins ?? []),
									[rehypePlugin, options],
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
		},
	};
}
