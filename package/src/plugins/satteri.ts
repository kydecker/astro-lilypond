import type { Code, Html } from "mdast";
import type { MdastPluginDefinition, MdastVisitorContext } from "satteri";
import { defaultOptions, render, resolveCrop } from "../render.js";
import {
	altTextForBlock,
	emitLilypondAsset,
	includePathsFor,
	isLilypondLang,
	prependVersion,
	renderedHtml,
	resolveDefaults,
	sourceNameFor,
	titleFor,
} from "../utils/index.js";
import type { PluginOptions } from "./types.js";

export function satteriPlugin(options: PluginOptions): MdastPluginDefinition {
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
			const alt = altTextForBlock(node.meta, node.value);
			const pages = await emitLilypondAsset({
				title,
				format,
				source,
				resolution,
				crop,
				sizeScale: crop ? cropScale : 1,
				binaryPath: options.binaryPath,
				render: () =>
					render(source, {
						format,
						crop,
						defaults: options.defaults,
						timeout: options.timeout,
						binaryPath: options.binaryPath,
						includePaths,
						sourceName,
					}),
			});

			return {
				type: "html",
				value: renderedHtml(pages, alt),
			};
		},
	};
}
