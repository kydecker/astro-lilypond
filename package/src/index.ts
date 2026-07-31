import type { AstroIntegration } from "astro";
import {
	type AstroComponentFactory,
	createComponent,
	renderTemplate,
	unescapeHTML,
} from "astro/runtime/server/index.js";
import emitAssetIntegration from "astro-emit-asset";
import type { Plugin } from "vite";
import type { AutoInstallOptions } from "./binary/index.js";
import {
	type PluginOptions,
	rehypePlugin,
	remarkPlugin,
	satteriPlugin,
} from "./plugins/index.js";
import { type LilypondDefaults, render as renderScore } from "./render.js";
import { getRenderState, resolveAndSetRenderState } from "./renderState.js";
import {
	altTextFor,
	emitLilypondAsset,
	emitLilypondPdfAsset,
	includePathsFor,
	type LilypondMetadata,
	lyTypeDeclarationsFor,
	parseLyHeaderFields,
	prependVersion,
	renderedHtml,
	resolveDefaults,
	sourceNameFor,
	titleFor,
	toLilypondMetadata,
} from "./utils/index.js";

export const LY_EXTENSIONS = [".ly", ".lilypond", ".ily"] as const;

export type {
	AstroComponentFactory,
	AutoInstallOptions,
	LilypondDefaults,
	LilypondMetadata,
	PluginOptions as LilypondPluginOptions,
};

export interface LilypondPage {
	src: string;
	width?: number;
	height?: number;
}

/**
 * The result of a `.ly`/`.ily`/`.lilypond` import
 * or `lilypondLoader()` collection entry.
 */
export interface LilypondScore {
	source: string;
	alt: string;
	sourceName: string | undefined;
	includePaths: string[];
	assetTitle: string;
	meta: LilypondMetadata;
}

export interface RenderOptions {
	/**
	 * Output format for `Score`.
	 * @default "svg"
	 */
	format?: "svg" | "png";

	/**
	 * Crop `Score` to a single tightly-fit image instead of full pages.
	 * @default false
	 */
	crop?: boolean;

	/**
	 * Render a downloadable PDF of the same score, returned as `pdf`.
	 * @default false
	 */
	pdf?: boolean;
}

export interface LilypondImageResult {
	pages: LilypondPage[];
	alt?: string;
}

export interface LilypondPdfResult {
	src: string;
}

export interface RenderResult {
	Score: AstroComponentFactory;
	pageCount: number;
	pdf?: LilypondPdfResult;
	meta: LilypondMetadata;
	raw: string;
}

interface ScoreProps {
	pageLimit?: number;
	class?: string;
	style?: string;
	alt?: string;
}

function createScoreComponent(
	content: LilypondImageResult,
): AstroComponentFactory {
	return createComponent((_result, props: ScoreProps) => {
		const alt = props.alt ?? content.alt ?? "";
		const html = renderedHtml(content.pages, alt, {
			class: props.class,
			style: props.style,
			pageLimit: props.pageLimit,
		});
		return renderTemplate`${unescapeHTML(html)}`;
	});
}

/**
 * Renders a `LilypondScore` (from a `.ly`/`.ily`/`.lilypond` import,
 * or a `lilypondLoader()` entry) to a renderable `<Score />` component.
 */
export async function render(
	score: LilypondScore,
	options: RenderOptions = {},
): Promise<RenderResult> {
	const state = getRenderState();
	const { resolution, cropScale } = resolveDefaults(state.defaults);
	const format = options.format ?? "svg";
	const crop = options.crop ?? false;

	const [{ Score, pageCount }, pdf] = await Promise.all([
		(async (): Promise<{ Score: AstroComponentFactory; pageCount: number }> => {
			const pages = await emitLilypondAsset({
				title: score.assetTitle,
				format,
				source: score.source,
				resolution,
				crop,
				sizeScale: crop ? cropScale : 1,
				binaryPath: state.binaryPath,
				render: () =>
					renderScore(score.source, {
						format,
						crop,
						defaults: state.defaults,
						timeout: state.timeout,
						binaryPath: state.binaryPath,
						includePaths: score.includePaths,
						sourceName: score.sourceName,
					}),
			});
			return {
				Score: createScoreComponent({ pages, alt: score.alt }),
				pageCount: pages.length,
			};
		})(),
		options.pdf
			? emitLilypondPdfAsset({
					title: score.assetTitle,
					source: score.source,
					binaryPath: state.binaryPath,
					render: () =>
						renderScore(score.source, {
							format: "pdf",
							crop: false,
							defaults: state.defaults,
							timeout: state.timeout,
							binaryPath: state.binaryPath,
							includePaths: score.includePaths,
							sourceName: score.sourceName,
						}),
				})
			: Promise.resolve(undefined),
	]);

	return { Score, pageCount, pdf, meta: score.meta, raw: score.source };
}

export async function renderAll(
	scores: LilypondScore[],
	options: RenderOptions = {},
): Promise<RenderResult[]> {
	return Promise.all(scores.map((score) => render(score, options)));
}

export interface LilypondOptions extends PluginOptions {
	/**
	 * Output format used by Markdown fences and `lilypondLoader()` entries.
	 * @default "svg"
	 */
	format?: "svg" | "png";

	/**
	 * Defaults passed to each score; can be overridden at render time.
	 */
	defaults?: LilypondDefaults;

	/**
	 * Ms to wait for a single `lilypond` invocation before aborting.
	 * @default 60000
	 */
	timeout?: number;

	/**
	 * When no `lilypond` binary is found on `PATH`, download a matching
	 * prebuilt release into a local cache and use that instead.
	 * @default true
	 */
	autoInstall?: boolean | AutoInstallOptions;
}

function lyFilePlugin(options: PluginOptions): Plugin {
	return {
		name: "vite-plugin-astro-lilypond-ly",
		enforce: "pre",
		async transform(source, id) {
			if (!LY_EXTENSIONS.some((ext) => id.endsWith(ext))) return;

			const { version } = resolveDefaults(options.defaults);
			const src = version ? prependVersion(source, version) : source;
			const includePaths = includePathsFor(id);
			const sourceName = sourceNameFor(id);
			const assetTitle = titleFor(sourceName);
			const meta = toLilypondMetadata(parseLyHeaderFields(source));
			const alt = altTextFor(meta);

			const score: LilypondScore = {
				source: src,
				alt,
				sourceName,
				includePaths,
				assetTitle,
				meta,
			};
			return {
				code: `export default ${JSON.stringify(score)}`,
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
				options.binaryPath = await resolveAndSetRenderState({
					autoInstall: options.autoInstall,
					defaults: options.defaults,
					timeout: options.timeout,
					logger,
				});

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
					content: lyTypeDeclarationsFor(LY_EXTENSIONS),
				});
			},
		},
	};
}
