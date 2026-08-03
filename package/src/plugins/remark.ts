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
	renderedErrorHtml,
	renderedHtml,
	resolveDefaults,
	sourceNameFor,
	titleFor,
} from "../utils/index.js";
import type { PluginOptions } from "./types.js";

export const remarkPlugin: Plugin<[PluginOptions], Root> = (options) => {
	const { logger } = options;
	if (!logger) {
		throw new Error(
			"astro-lilypond: please add the `lilypond()` integration to your Astro config.",
		);
	}
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

			const promise = (async (): Promise<void> => {
				let value: string;
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
								logger,
							}),
					});
					value = renderedHtml(pages, alt);
				} catch (err) {
					if (!options.isDev) throw err;
					value = renderedErrorHtml(err, title);
				}
				const htmlNode: Html = { type: "html", value };
				parent.children[index] = htmlNode;
			})();

			promises.push(promise);
		});

		await Promise.all(promises);
	};
};
