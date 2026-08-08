import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import {
	type AstroComponentFactory,
	createComponent,
	renderComponent,
	renderTemplate,
	unescapeHTML,
} from "astro/runtime/server/index.js";
import emitAssetIntegration from "astro-emit-asset";
import type { Plugin } from "vite";
import {
	type AutoInstallOptions,
	resolveAutoInstallOption,
	resolveLilypondBinary,
} from "./binary/index.js";
import {
	type PluginOptions,
	remarkPlugin,
	satteriPlugin,
} from "./plugins/index.js";
import { type LilypondDefaults, render } from "./render.js";
import { getLilypondState, setLilypondState } from "./state.js";
import {
	altTextFor,
	emitLilypondAsset,
	emitLilypondPdfAsset,
	includePathsFor,
	type LilypondMetadata,
	lyTypeDeclarationsFor,
	parseLyHeaderFields,
	prependVersion,
	renderedErrorHtml,
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
	sourceName?: string;
	includePaths: string[];
	assetTitle: string;
	meta: LilypondMetadata;
}

export interface GetScoreOptions {
	/**
	 * Output format for `Score`.
	 * @default the `defaults.format` configured on the integration ("svg" unless overridden)
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

export interface GetScoreResult {
	Score: AstroComponentFactory;
	pages: LilypondPage[];
	pdf?: LilypondPdfResult;
	meta: LilypondMetadata;
	raw: string;
}

interface ScoreImageProps {
	pageLimit?: number;
	class?: string;
	style?: string;
	alt?: string;
}

function createScoreComponent(
	content: LilypondImageResult,
): AstroComponentFactory {
	return createComponent((_result, props: ScoreImageProps) => {
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
 * Dev-only fallback for `getScore()`: renders an inline error block
 * instead of the score.
 */
function createErrorScoreComponent(
	error: unknown,
	title: string,
): AstroComponentFactory {
	return createComponent(() => {
		return renderTemplate`${unescapeHTML(renderedErrorHtml(error, title))}`;
	});
}

/**
 * Renders a `LilypondScore` (from a `.ly`/`.ily`/`.lilypond` import,
 * or a `lilypondLoader()` entry) to a renderable `<Score />` component.
 */
export async function getScore(
	score: LilypondScore,
	options: GetScoreOptions = {},
): Promise<GetScoreResult> {
	const state = getLilypondState();
	const { logger } = state;
	const {
		resolution,
		cropScale,
		format: defaultFormat,
	} = resolveDefaults(state.defaults);
	const format = options.format ?? defaultFormat;
	const crop = options.crop ?? false;

	try {
		const [{ Score, pages }, pdf] = await Promise.all([
			(async (): Promise<{
				Score: AstroComponentFactory;
				pages: LilypondPage[];
			}> => {
				const pages = await emitLilypondAsset({
					title: score.assetTitle,
					format,
					source: score.source,
					resolution,
					crop,
					sizeScale: crop ? cropScale : 1,
					binaryPath: state.binaryPath,
					render: () =>
						render(score.source, {
							format,
							crop,
							defaults: state.defaults,
							timeout: state.timeout,
							binaryPath: state.binaryPath,
							includePaths: score.includePaths,
							sourceName: score.sourceName,
							logger,
						}),
				});
				return {
					Score: createScoreComponent({ pages, alt: score.alt }),
					pages,
				};
			})(),
			options.pdf
				? emitLilypondPdfAsset({
						title: score.assetTitle,
						source: score.source,
						binaryPath: state.binaryPath,
						render: () =>
							render(score.source, {
								format: "pdf",
								crop: false,
								defaults: state.defaults,
								timeout: state.timeout,
								binaryPath: state.binaryPath,
								includePaths: score.includePaths,
								sourceName: score.sourceName,
								logger,
							}),
					})
				: Promise.resolve(undefined),
		]);

		return { Score, pages, pdf, meta: score.meta, raw: score.source };
	} catch (err) {
		if (!state.isDev) throw err;
		return {
			Score: createErrorScoreComponent(err, score.assetTitle),
			pages: [],
			pdf: undefined,
			meta: score.meta,
			raw: score.source,
		};
	}
}

export interface ScoreProps
	extends ScoreImageProps,
		Pick<GetScoreOptions, "format" | "crop"> {
	/**
	 * A `LilypondScore` from a `.ly`/`.ily`/`.lilypond` import
	 * or a `lilypondLoader()` entry.
	 */
	content: LilypondScore;
}

/**
 * Renders a `LilypondScore` directly, for the common case where none of
 * `getScore()`'s `pages`, `meta`, `raw`, or `pdf` are needed. Use
 * `getScore()` instead when you need those.
 */
export const Score: AstroComponentFactory = createComponent(
	async (result, props: ScoreProps) => {
		const { content, format, crop, ...imageProps } = props;
		const { Score: ContentScore } = await getScore(content, { format, crop });
		return renderTemplate`${renderComponent(result, "Score", ContentScore, imageProps)}`;
	},
);

export interface LilypondOptions extends PluginOptions {
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

	/**
	 * Extra directories to search for `\include`d files, in addition to each
	 * score's own directory. Relative paths resolve against the project root.
	 * @default []
	 */
	includePaths?: string[];
}

function injectMarkdownPlugin(
	processor: { options: object },
	key: string,
	plugin: unknown,
): void {
	if (!processor.options) {
		processor.options = {};
	}
	const options = processor.options as Record<string, unknown[]>;
	options[key] = [...(options[key] ?? []), plugin];
}

function lyFilePlugin(options: PluginOptions): Plugin {
	return {
		name: "vite-plugin-astro-lilypond-ly",
		enforce: "pre",
		async transform(source, id) {
			if (!LY_EXTENSIONS.some((ext) => id.endsWith(ext))) return;

			const { version } = resolveDefaults(options.defaults);
			const src = version ? prependVersion(source, version) : source;
			const includePaths = includePathsFor(id, options.includePaths);
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
			"astro:config:setup": async ({
				command,
				config,
				updateConfig,
				logger,
			}) => {
				const isDev = command === "dev";
				options.isDev = isDev;
				options.logger = logger;

				const binaryPath = await resolveLilypondBinary({
					...resolveAutoInstallOption(options.autoInstall),
					log: (message) => logger.info(message),
					warn: (message) => logger.warn(message),
				});
				options.binaryPath = binaryPath;
				const includePaths = (options.includePaths ?? []).map((path) =>
					fileURLToPath(new URL(path, config.root)),
				);
				options.includePaths = includePaths;
				setLilypondState({
					binaryPath,
					defaults: options.defaults,
					timeout: options.timeout,
					isDev,
					logger,
					includePaths,
				});

				updateConfig({
					integrations: [emitAssetIntegration()],
					vite: { plugins: [lyFilePlugin(options)] },
				});

				const existingProcessor = config.markdown?.processor;

				if (existingProcessor?.name === "satteri") {
					injectMarkdownPlugin(
						existingProcessor,
						"mdastPlugins",
						satteriPlugin(options),
					);
					updateConfig({ markdown: { processor: existingProcessor } });
					logger?.info("Registered Sätteri mdast plugin");
					return;
				}

				if (existingProcessor?.name === "unified") {
					injectMarkdownPlugin(existingProcessor, "remarkPlugins", [
						remarkPlugin,
						options,
					]);
					updateConfig({ markdown: { processor: existingProcessor } });
					logger?.info("Registered unified remark plugin");
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
