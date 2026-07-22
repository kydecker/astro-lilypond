import type { Html, Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { defaultOptions, render } from "../render.js";
import {
	contentHashFor,
	includePathsFor,
	isLilypondLang,
	prependVersion,
	renderedHtml,
	resolveDefaults,
	sourceNameFor,
	titleFor,
} from "../utils/index.js";
import { writeAssets } from "../writeAsset.js";
import type { ResolvedPluginOptions } from "./types.js";

export type RemarkPluginOptions = ResolvedPluginOptions;

export const remarkPlugin: Plugin<[RemarkPluginOptions], Root> = (options) => {
	return async (tree, file) => {
		const promises: Promise<void>[] = [];
		const fileNames: string[] = [];
		const includePaths = includePathsFor(file?.path);
		const sourceName = sourceNameFor(file?.path);
		const title = titleFor(sourceName);

		visit(tree, "code", (node, index, parent) => {
			if (!isLilypondLang(node.lang) || index === undefined || !parent) return;

			const {
				version,
				resolution,
				crop: cropSetting,
			} = resolveDefaults(options.defaults);
			const source = version ? prependVersion(node.value, version) : node.value;
			const format = options.format ?? defaultOptions.format;
			// Markdown fences crop unless `defaults.crop` is explicitly `false`.
			const crop = cropSetting !== false;
			const hash = contentHashFor({ source, format, resolution, crop });

			const promise = writeAssets({
				hash,
				title,
				format,
				outputDir: options.assetsDir,
				urlBase: options.assetsUrlBase,
				trackAsset: options.trackAsset,
				getBuffers: () =>
					render(source, {
						format,
						crop,
						defaults: options.defaults,
						timeout: options.timeout,
						includePaths,
						sourceName,
					}),
			}).then((assets): void => {
				fileNames.push(...assets.map((asset) => asset.fileName));
				const htmlNode: Html = {
					type: "html",
					value: renderedHtml(assets.map((asset) => asset.url)),
				};
				parent.children[index] = htmlNode;
			});

			promises.push(promise);
		});

		await Promise.all(promises);

		if (file?.path) {
			await options.pruneStaleAssets(file.path, fileNames);
		}
	};
};
