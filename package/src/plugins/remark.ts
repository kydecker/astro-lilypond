import type { Html, Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
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

export type RemarkPluginOptions = PluginOptions;

export const remarkPlugin: Plugin<[RemarkPluginOptions], Root> = (options) => {
	return async (tree, file) => {
		const promises: Promise<void>[] = [];
		const includePaths = includePathsFor(file?.path);
		const sourceName = sourceNameFor(file?.path);
		const title = titleFor(sourceName);

		visit(tree, "code", (node, index, parent) => {
			if (!isLilypondLang(node.lang) || index === undefined || !parent) return;

			const {
				version,
				resolution,
				crop: cropSetting,
				cropScale,
			} = resolveDefaults(options.defaults);
			const source = version ? prependVersion(node.value, version) : node.value;
			const format = options.format ?? defaultOptions.format;
			const crop = resolveCrop(cropSetting, "markdown");
			const alt = altTextForBlock(node.meta, node.value);

			const promise = emitLilypondAsset({
				title,
				format,
				source,
				resolution,
				crop,
				sizeScale: crop ? cropScale : 1,
				render: () =>
					render(source, {
						format,
						crop,
						defaults: options.defaults,
						timeout: options.timeout,
						includePaths,
						sourceName,
					}),
			}).then((pages): void => {
				const htmlNode: Html = {
					type: "html",
					value: renderedHtml(pages, alt),
				};
				parent.children[index] = htmlNode;
			});

			promises.push(promise);
		});

		await Promise.all(promises);
	};
};
