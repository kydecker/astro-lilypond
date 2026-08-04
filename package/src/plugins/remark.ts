import type { Html, Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import {
	includePathsFor,
	isLilypondLang,
	sourceNameFor,
	titleFor,
} from "../utils/index.js";
import { renderMarkdownBlock } from "./renderMarkdownBlock.js";
import type { PluginOptions } from "./types.js";

export const remarkPlugin: Plugin<[PluginOptions], Root> = (options) => {
	const { logger } = options;
	if (!logger) {
		throw new Error(
			"astro-lilypond: please add the `lilypond()` integration to your Astro config.",
		);
	}
	const renderOptions = { ...options, logger };
	return async (tree, file) => {
		const promises: Promise<void>[] = [];
		const includePaths = includePathsFor(file?.path);
		const sourceName = sourceNameFor(file?.path);
		const title = titleFor(sourceName);

		visit(tree, "code", (node, index, parent) => {
			if (!isLilypondLang(node.lang) || index === undefined || !parent) return;

			const promise = renderMarkdownBlock(renderOptions, {
				title,
				value: node.value,
				meta: node.meta,
				includePaths,
				sourceName,
			}).then((value) => {
				const htmlNode: Html = { type: "html", value };
				parent.children[index] = htmlNode;
			});

			promises.push(promise);
		});

		await Promise.all(promises);
	};
};
