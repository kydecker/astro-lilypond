import type { Html, Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { render } from "./render.js";
import { errorHtml, isLilypondLang, prependVersion, renderToHtml, resolveFormat } from "./util.js";
import type { OutputFormat } from "./util.js";

export interface RemarkPluginOptions {
	version?: string;
	format?: OutputFormat;
}

export const remarkLilypondPlugin: Plugin<[RemarkPluginOptions?], Root> = (
	options = {},
) => {
	return async (tree) => {
		const promises: Promise<void>[] = [];

		visit(tree, "code", (node, index, parent) => {
			if (!isLilypondLang(node.lang) || index === undefined || !parent) return;

			const source = options.version
				? prependVersion(node.value, options.version)
				: node.value;
			const { format, resolution } = resolveFormat(options.format ?? "svg");

			const promise = render(source, { format, resolution })
				.then((buf): void => {
					const htmlNode: Html = {
						type: "html",
						value: renderToHtml(buf, format),
					};
					parent.children[index] = htmlNode;
				})
				.catch((err): void => {
					const htmlNode: Html = { type: "html", value: errorHtml(err) };
					parent.children[index] = htmlNode;
				});

			promises.push(promise);
		});

		await Promise.all(promises);
	};
};
