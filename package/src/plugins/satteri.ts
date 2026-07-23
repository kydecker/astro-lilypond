import type { Code, Html } from "mdast";
import type { MdastPluginDefinition, MdastVisitorContext } from "satteri";
import { defaultOptions, render, resolveCrop } from "../render.js";
import {
	altTextForBlock,
	contentHashFor,
	includePathsFor,
	isLilypondLang,
	prependVersion,
	renderedHtml,
	resolveDefaults,
	sourceNameFor,
	titleFor,
} from "../utils/index.js";
import { writeAssets } from "../writeAsset.js";
import type { ResolvedPluginOptions } from "./types.js";

export type SatteriPluginOptions = ResolvedPluginOptions;

export function satteriPlugin(
	options: SatteriPluginOptions,
): MdastPluginDefinition {
	return {
		name: "astro-lilypond",
		// Returning an mdast Html node (type: 'html') emits the value verbatim.
		// Sätteri's { rawHtml } escape hatch applies MDX brace-escaping which
		// would corrupt SVG content, so we use the plain html node form instead.
		async code(
			node: Readonly<Code>,
			ctx: MdastVisitorContext,
		): Promise<Html | undefined> {
			if (!isLilypondLang(node.lang)) return undefined;
			const {
				version,
				resolution,
				crop: cropSetting,
				cropScale,
			} = resolveDefaults(options.defaults);
			const source = version ? prependVersion(node.value, version) : node.value;
			const format = options.format ?? defaultOptions.format;
			const includePaths = includePathsFor(ctx.fileURL);
			const sourceName = sourceNameFor(ctx.fileURL);
			const title = titleFor(sourceName);
			const crop = resolveCrop(cropSetting, "markdown");
			const hash = contentHashFor({ source, format, resolution, crop });
			const alt = altTextForBlock(node.meta, node.value);
			const assets = await writeAssets({
				hash,
				title,
				format,
				outputDir: options.assetsDir,
				urlBase: options.assetsUrlBase,
				trackAsset: options.trackAsset,
				sizeScale: crop ? cropScale : 1,
				getBuffers: () =>
					render(source, {
						format,
						crop,
						defaults: options.defaults,
						timeout: options.timeout,
						includePaths,
						sourceName,
					}),
			});

			// Sätteri has no per-file "done" hook, so prune per block instead.
			if (ctx.fileURL) {
				const index = ctx.indexOf(node) ?? "root";
				await options.pruneStaleAssets(
					`${ctx.fileURL.href}#${index}`,
					assets.map((asset) => asset.fileName),
				);
			}

			return {
				type: "html",
				value: renderedHtml(assets, alt),
			};
		},
	};
}
