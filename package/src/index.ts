import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AstroIntegration } from "astro";
import type { Plugin } from "vite";
import {
	type PluginOptions,
	rehypePlugin,
	remarkPlugin,
	satteriPlugin,
} from "./plugins/index.js";
import { defaultOptions, render } from "./render.js";
import {
	includePathsFor,
	prependVersion,
	renderToHtml,
	sourceNameFor,
} from "./utils/index.js";

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
	 * Output format. Defaults to `"svg"`.
	 *
	 * - `"svg"` — inline SVG embedded directly in the HTML (default)
	 * - `"png"` — `<img>` element with a base64 data URI
	 */
	format?: "svg" | "png";
	/**
	 * Resolution in DPI (only applies to PNG). Defaults to `144`.
	 */
	resolution?: number;
	/**
	 * Crop the output tightly to the content bounding box. Defaults to `true`.
	 */
	crop?: boolean;
	/**
	 * Milliseconds to wait for a single `lilypond` invocation before
	 * aborting it. Defaults to `60000` (60s).
	 */
	timeout?: number;
}

function lyFilePlugin(options: LilypondOptions): Plugin {
	return {
		name: "vite-plugin-astro-lilypond-ly",
		enforce: "pre",
		async transform(source, id) {
			if (!LY_EXTENSIONS.some((ext) => id.endsWith(ext))) return;
			const src = options.version
				? prependVersion(source, options.version)
				: source;
			const format = options.format ?? defaultOptions.format;
			const buf = await render(src, {
				format,
				resolution: options.resolution,
				crop: options.crop,
				timeout: options.timeout,
				includePaths: includePathsFor(id),
				sourceName: sourceNameFor(id),
			});
			return {
				code: `export default ${JSON.stringify(renderToHtml(buf, format))}`,
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
					content: LY_EXTENSIONS.map(
						(ext) =>
							`declare module "*${ext}" {\n  const html: string;\n  export default html;\n}`,
					).join("\n"),
				});
			},
		},
	};
}
