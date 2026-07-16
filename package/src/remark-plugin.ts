import type { Html, Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { defaultOptions, render } from "./render.js";
import {
	includePathsFor,
	isLilypondLang,
	prependVersion,
	renderToHtml,
	sourceNameFor,
} from "./util.js";
import type { LilypondPluginOptions } from "./util.js";

export type RemarkPluginOptions = LilypondPluginOptions;

export const remarkLilypondPlugin: Plugin<[RemarkPluginOptions?], Root> = (
	options = {},
) => {
	return async (tree, file) => {
		const promises: Promise<void>[] = [];
		const includePaths = includePathsFor(file?.path);
		const sourceName = sourceNameFor(file?.path);

		visit(tree, "code", (node, index, parent) => {
			if (!isLilypondLang(node.lang) || index === undefined || !parent) return;

			const source = options.version
				? prependVersion(node.value, options.version)
				: node.value;
			const format = options.format ?? defaultOptions.format;

			const promise = render(source, {
				format,
				resolution: options.resolution,
				crop: options.crop,
				includePaths,
				sourceName,
			})
				.then((buf): void => {
					const htmlNode: Html = {
						type: "html",
						value: renderToHtml(buf, format),
					};
					parent.children[index] = htmlNode;
				});

			promises.push(promise);
		});

		await Promise.all(promises);
	};
};
