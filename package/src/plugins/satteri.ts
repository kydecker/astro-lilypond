import type { Code, Html } from "mdast";
import type { MdastPluginDefinition, MdastVisitorContext } from "satteri";
import { defaultOptions, render } from "../render.js";
import {
	contentHashFor,
	imgTag,
	includePathsFor,
	isLilypondLang,
	prependVersion,
	sourceNameFor,
	titleFor,
} from "../utils/index.js";
import { writeAsset } from "../writeAsset.js";
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
			const source = options.version
				? prependVersion(node.value, options.version)
				: node.value;
			const format = options.format ?? defaultOptions.format;
			const resolution = options.resolution ?? defaultOptions.resolution;
			const crop = options.crop ?? defaultOptions.crop;
			const includePaths = includePathsFor(ctx.fileURL);
			const sourceName = sourceNameFor(ctx.fileURL);
			const title = titleFor(sourceName);
			const hash = contentHashFor({ source, format, resolution, crop });
			const fileName = `${hash}.${title}.${format}`;
			const url = await writeAsset({
				hash,
				title,
				format,
				outputDir: options.assetsDir,
				urlBase: options.assetsUrlBase,
				trackAsset: options.trackAsset,
				getBuffer: () =>
					render(source, {
						format,
						resolution: options.resolution,
						crop: options.crop,
						timeout: options.timeout,
						includePaths,
						sourceName,
					}),
			});

			// Sätteri has no per-file "done" hook, so prune per block instead.
			if (ctx.fileURL) {
				const index = ctx.indexOf(node) ?? "root";
				await options.pruneStaleAssets(`${ctx.fileURL.href}#${index}`, [
					fileName,
				]);
			}

			return { type: "html", value: imgTag(url) };
		},
	};
}
