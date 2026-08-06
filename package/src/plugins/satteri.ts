import type { Code } from "mdast";
import type { MdastPluginDefinition, MdastVisitorContext } from "satteri";
import {
	includePathsFor,
	isLilypondLang,
	sourceNameFor,
	titleFor,
} from "../utils/index.js";
import { renderMarkdownBlock } from "./renderMarkdownBlock.js";
import type { PluginOptions } from "./types.js";

export function satteriPlugin(options: PluginOptions): MdastPluginDefinition {
	const { logger } = options;
	if (!logger) {
		throw new Error(
			"astro-lilypond: please add the `lilypond()` integration to your Astro config.",
		);
	}
	const renderOptions = { ...options, logger };
	return {
		name: "astro-lilypond",
		async code(
			node: Readonly<Code>,
			ctx: MdastVisitorContext,
		): Promise<{ rawHtml: string } | undefined> {
			if (!isLilypondLang(node.lang)) return undefined;
			const sourceName = sourceNameFor(ctx.fileURL);
			const rawHtml = await renderMarkdownBlock(renderOptions, {
				title: titleFor(sourceName),
				value: node.value,
				meta: node.meta,
				includePaths: includePathsFor(ctx.fileURL, options.includePaths),
				sourceName,
			});
			return { rawHtml };
		},
	};
}
