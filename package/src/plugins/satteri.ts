import type { Code } from "mdast";
import type { MdastPluginDefinition, MdastVisitorContext } from "satteri";
import { defaultOptions, render } from "../render.js";
import {
	altTextForBlock,
	emitLilypondAsset,
	includePathsFor,
	isLilypondLang,
	prependVersion,
	renderedErrorHtml,
	renderedHtml,
	resolveDefaults,
	sourceNameFor,
	titleFor,
} from "../utils/index.js";
import type { PluginOptions } from "./types.js";

export function satteriPlugin(options: PluginOptions): MdastPluginDefinition {
	return {
		name: "astro-lilypond",
		async code(
			node: Readonly<Code>,
			ctx: MdastVisitorContext,
		): Promise<{ rawHtml: string } | undefined> {
			if (!isLilypondLang(node.lang)) return undefined;
			const { version, resolution, cropScale } = resolveDefaults(
				options.defaults,
			);
			const source = version ? prependVersion(node.value, version) : node.value;
			const format = options.format ?? defaultOptions.format;
			const includePaths = includePathsFor(ctx.fileURL);
			const sourceName = sourceNameFor(ctx.fileURL);
			const title = titleFor(sourceName);
			const alt = altTextForBlock(node.meta, node.value);
			try {
				const pages = await emitLilypondAsset({
					title,
					format,
					source,
					resolution,
					crop: true,
					sizeScale: cropScale,
					binaryPath: options.binaryPath,
					render: () =>
						render(source, {
							format,
							crop: true,
							defaults: options.defaults,
							timeout: options.timeout,
							binaryPath: options.binaryPath,
							includePaths,
							sourceName,
						}),
				});
				return { rawHtml: renderedHtml(pages, alt) };
			} catch (err) {
				if (!options.isDev) throw err;
				return { rawHtml: renderedErrorHtml(err, title) };
			}
		},
	};
}
