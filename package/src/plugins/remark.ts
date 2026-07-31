import type { Html, Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { defaultOptions, render } from "../render.js";
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

export const remarkPlugin: Plugin<[PluginOptions], Root> = (options) => {
	return async (tree, file) => {
		const promises: Promise<void>[] = [];
		const includePaths = includePathsFor(file?.path);
		const sourceName = sourceNameFor(file?.path);
		const title = titleFor(sourceName);

		visit(tree, "code", (node, index, parent) => {
			if (!isLilypondLang(node.lang) || index === undefined || !parent) return;

			const { version, resolution, cropScale } = resolveDefaults(
				options.defaults,
			);
			const source = version ? prependVersion(node.value, version) : node.value;
			const format = options.format ?? defaultOptions.format;
			const alt = altTextForBlock(node.meta, node.value);

			const promise = emitLilypondAsset({
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
