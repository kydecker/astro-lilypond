import { visit } from "unist-util-visit";
import { defaultOptions, render } from "./render.js";
import type { LilypondPluginOptions } from "./util.js";
import {
	includePathsFor,
	isLilypondLang,
	prependVersion,
	renderToHtml,
	sourceNameFor,
} from "./util.js";

// Raw node type — an Astro/rehype extension not in the standard @types/hast
interface RawNode {
	type: "raw";
	value: string;
}

export type RehypePluginOptions = LilypondPluginOptions;

// Typed loosely so it's assignable to both RehypePlugin and the unified
// Plugin generic regardless of which @types/hast version the host project pins.
export function rehypeLilypondPlugin(
	options: RehypePluginOptions = {},
	// biome-ignore lint/suspicious/noExplicitAny: see above
): (tree: any, file?: { path?: string }) => Promise<void> {
	return async (tree, file) => {
		const promises: Promise<void>[] = [];
		const includePaths = includePathsFor(file?.path);
		const sourceName = sourceNameFor(file?.path);

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

			const source = options.version
				? prependVersion(raw, options.version)
				: raw;
			const format = options.format ?? defaultOptions.format;

			const promise = render(source, {
				format,
				resolution: options.resolution,
				crop: options.crop,
				includePaths,
				sourceName,
			}).then((buf): void => {
				const rawNode: RawNode = {
					type: "raw",
					value: renderToHtml(buf, format),
				};
				parent.children[index] = rawNode;
			});

			promises.push(promise);
		});

		await Promise.all(promises);
	};
}
