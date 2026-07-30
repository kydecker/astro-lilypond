import type { AstroIntegration } from "astro";
import {
	type AstroComponentFactory,
	createComponent,
	renderComponent,
	renderTemplate,
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
	rehypePlugin,
	remarkPlugin,
	satteriPlugin,
} from "./plugins/index.js";
import {
	type LilypondDefaults,
	render as renderScore,
	resolveCrop,
} from "./render.js";
import { getRenderState, setRenderState } from "./renderState.js";
import {
	altTextFor,
	emitLilypondAsset,
	emitLilypondPdfAsset,
	includePathsFor,
	type LilypondMetadata,
	lyTypeDeclarationsFor,
	parseLyHeaderFields,
	prependVersion,
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

/** The rendered output of a Markdown fence or `lilypondLoader()` entry. */
export interface LilypondContent {
	pages: LilypondPage[];
	alt?: string;
}

/**
 * A lazy handle produced by importing a `.ly`/`.ily`/`.lilypond` file, or by
 * a `lilypondLoader()` content-collection entry — carries everything
 * `render()` needs (source text, derived metadata), but nothing has been
 * rendered to any format yet. The same `render()` call works on either kind
 * of handle.
 */
export interface LilypondScore {
	source: string;
	alt: string;
	sourceName: string | undefined;
	includePaths: string[];
	/** Base name used to title the emitted asset file. Not a display title. */
	assetTitle: string;
	/** Fields parsed from the score's `\header` block(s). */
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
	 * @default resolved from the integration's `defaults.crop`
	 */
	crop?: boolean;

	/**
	 * Also render a downloadable PDF of the same score, returned as `pdf`.
	 * Always rendered uncropped/full-page, regardless of `crop` — cropping
	 * merges multi-page scores into one tall image, which is wrong for a
	 * printable document.
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
	/**
	 * A renderable component — use it directly as `<Score />` (any props you
	 * pass through, e.g. `class`/`style`/`pageLimit`/`alt`, forward to the
	 * underlying `<LilyPond>`). Mirrors Astro's own `Content` component from
	 * `render()` on a Markdown/content-collection entry.
	 */
	Score: AstroComponentFactory;
	/** How many pages `Score` renders — read this instead of reaching inside the component. */
	pageCount: number;
	pdf?: LilypondPdfResult;
	/** The rendered score's `meta`, passed straight through from the input `LilypondScore`. */
	meta: LilypondMetadata;
}

/**
 * Wraps a rendered image as a `<Score />`-able component, forwarding any
 * props to `<LilyPond>`. Imports `LilyPond.astro` lazily, at actual render
 * time — deferring `.astro`-file resolution until Astro's compiler Vite
 * plugin is definitely active, rather than whenever this module first
 * loads (e.g. while Astro is still loading `astro.config.mjs` itself).
 */
function createScoreComponent(
	content: LilypondImageResult,
): AstroComponentFactory {
	return createComponent(async (result, props, slots) => {
		const { default: LilyPondComponent } = await import(
			"../components/LilyPond.astro"
		);
		// A bare renderComponent() call isn't itself a valid factory return
		// value — it must be wrapped in renderTemplate (the `render` tag
		// compiled `.astro` output always uses), which is what actually
		// produces a RenderTemplateResult Astro's pipeline knows how to render.
		return renderTemplate`${renderComponent(
			result,
			"LilyPond",
			LilyPondComponent,
			{ content, ...props },
			slots,
		)}`;
	});
}

/**
 * Renders a `LilypondScore` handle (from a `.ly`/`.ily`/`.lilypond` import,
 * or a `lilypondLoader()` entry) to a renderable `<Score />` component,
 * optionally alongside a downloadable PDF (`pdf`). Both are independent
 * `lilypond` invocations — LilyPond's SVG backend can't be combined with
 * other formats in a single run — so they're rendered concurrently when
 * both are requested.
 *
 * Only call this from statically-prerendered pages/components. On an
 * on-demand SSR route it would shell out to the `lilypond` binary on every
 * request.
 */
export async function render(
	score: LilypondScore,
	options: RenderOptions = {},
): Promise<RenderResult> {
	const state = getRenderState();
	const {
		resolution,
		crop: cropSetting,
		cropScale,
	} = resolveDefaults(state.defaults);
	const format = options.format ?? "svg";
	const crop = options.crop ?? resolveCrop(cropSetting, "component");

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

	return { Score, pageCount, pdf, meta: score.meta };
}

/**
 * Convenience wrapper for rendering many scores at once, e.g. every entry in
 * a `getCollection()` result — `renderAll(scores.map((s) => s.data))` instead
 * of hand-rolling `Promise.all(scores.map((s) => render(s.data)))`. Every
 * score is rendered concurrently, with the same `options` applied to each.
 *
 * Only takes plain `LilypondScore` values, not content-collection entries —
 * pass `entry.data` (or `.map((s) => s.data)` across a collection) yourself,
 * same as a single `render()` call.
 */
export async function renderAll(
	scores: LilypondScore[],
	options: RenderOptions = {},
): Promise<RenderResult[]> {
	return Promise.all(scores.map((score) => render(score, options)));
}

export interface LilypondOptions extends PluginOptions {
	/**
	 * Output format used by Markdown fences and `lilypondLoader()` entries.
	 * Does not affect plain `.ly`/`.ily` imports, which are format-agnostic
	 * until a `render()` call picks a format per request.
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
	 * When no `lilypond` binary is found on `PATH`, download a matching
	 * prebuilt release into a local cache and use that instead. Set to
	 * `false` to only ever use a `PATH` install, or pass an object to pick
	 * which version gets downloaded.
	 * @default true
	 */
	autoInstall?: boolean | AutoInstallOptions;
}

function lyFilePlugin(options: PluginOptions): Plugin {
	return {
		name: "vite-plugin-astro-lilypond-ly",
		enforce: "pre",
		async transform(source, id) {
			// No query params are recognized on `.ly`-family imports anymore —
			// fall through to Vite's own handling (e.g. `?raw`, `?url`).
			if (id.includes("?")) return;
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
				options.binaryPath = await resolveLilypondBinary({
					...resolveAutoInstallOption(options.autoInstall),
					log: (message) => logger?.info(message),
					warn: (message) => logger?.warn(message),
				});
				setRenderState({
					binaryPath: options.binaryPath,
					defaults: options.defaults,
					timeout: options.timeout,
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
