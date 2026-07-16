import type { Code, Html } from "mdast";
import type {
	MdastPluginDefinition,
	MdastVisitorContext,
} from "satteri";
import { defaultOptions, render } from "./render.js";
import {
	includePathsFor,
	isLilypondLang,
	prependVersion,
	renderToHtml,
	sourceNameFor,
} from "./util.js";
import type { LilypondPluginOptions } from "./util.js";

export type SatteriPluginOptions = LilypondPluginOptions;

export function satteriLilypondPlugin(
	options: SatteriPluginOptions = {},
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
			const source = options.version
				? prependVersion(node.value, options.version)
				: node.value;
			const format = options.format ?? defaultOptions.format;
			const includePaths = includePathsFor(ctx.fileURL);
			const sourceName = sourceNameFor(ctx.fileURL);
			const buf = await render(source, {
				format,
				resolution: options.resolution,
				crop: options.crop,
				includePaths,
				sourceName,
			});
			return { type: "html", value: renderToHtml(buf, format) };
		},
	};
}
