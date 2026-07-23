import { visit } from "unist-util-visit";
import { defaultOptions, render, resolveCrop } from "../render.js";
import {
	altTextForBlock,
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

// Raw node type — an Astro/rehype extension not in the standard @types/hast
interface RawNode {
	type: "raw";
	value: string;
}

export type RehypePluginOptions = ResolvedPluginOptions;

// Typed loosely so it's assignable to both RehypePlugin and the unified
// Plugin generic regardless of which @types/hast version the host project pins.
export function rehypePlugin(
	options: RehypePluginOptions,
	// biome-ignore lint/suspicious/noExplicitAny: see above
): (tree: any, file?: { path?: string }) => Promise<void> {
	return async (tree, file) => {
		const promises: Promise<void>[] = [];
		const fileNames: string[] = [];
		const includePaths = includePathsFor(file?.path);
		const sourceName = sourceNameFor(file?.path);
		const title = titleFor(sourceName);

		visit(tree, "element", (node, index, parent) => {
			if (
				node.tagName !== "pre" ||
				node.children?.length !== 1 ||
				node.children[0].type !== "element" ||
				node.children[0].tagName !== "code" ||
				index === undefined ||
				!parent
			)
				return;

			const codeNode = node.children[0];
			const cls = codeNode.properties?.className as unknown;
			if (!Array.isArray(cls)) return;
			const lang = (cls as string[])
				.find((c) => c.startsWith("language-"))
				?.slice("language-".length);
			if (!isLilypondLang(lang)) return;

			const raw: string = (
				codeNode.children as Array<{ type: string; value: string }>
			)
				.filter((c) => c.type === "text")
				.map((c) => c.value)
				.join("");

			const {
				version,
				resolution,
				crop: cropSetting,
				cropScale,
			} = resolveDefaults(options.defaults);
			const source = version ? prependVersion(raw, version) : raw;
			const format = options.format ?? defaultOptions.format;
			const crop = resolveCrop(cropSetting, "markdown");
			const hash = contentHashFor({ source, format, resolution, crop });
			const alt = altTextForBlock(codeNode.data?.meta, raw);

			const promise = writeAssets({
				hash,
				title,
				format,
				outputDir: options.assetsDir,
				urlBase: options.assetsUrlBase,
				trackAsset: options.trackAsset,
				sizeScale: crop ? cropScale : 1,
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
				const rawNode: RawNode = {
					type: "raw",
					value: renderedHtml(assets, alt),
				};
				parent.children[index] = rawNode;
			});

			promises.push(promise);
		});

		await Promise.all(promises);

		if (file?.path) {
			await options.pruneStaleAssets(file.path, fileNames);
		}
	};
}
