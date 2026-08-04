import { render } from "../render.js";
import {
	altTextForBlock,
	emitLilypondAsset,
	prependVersion,
	renderedErrorHtml,
	renderedHtml,
	resolveDefaults,
} from "../utils/index.js";
import type { PluginOptions } from "./types.js";

export interface MarkdownBlock {
	title: string;
	value: string;
	meta: string | null | undefined;
	includePaths: string[];
	sourceName: string | undefined;
}

/**
 * Renders one fenced ```lilypond block to HTML. Shared by the remark and
 * satteri plugins. `logger` is required here (unlike `PluginOptions`) since
 * each plugin's registration-time "add the integration" guard already
 * narrowed it before calling this.
 */
export async function renderMarkdownBlock(
	options: Omit<PluginOptions, "logger"> & {
		logger: NonNullable<PluginOptions["logger"]>;
	},
	block: MarkdownBlock,
): Promise<string> {
	const { logger } = options;
	const { title } = block;
	const { version, format, resolution, cropScale } = resolveDefaults(
		options.defaults,
	);
	const source = version ? prependVersion(block.value, version) : block.value;
	const alt = altTextForBlock(block.meta, block.value);

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
					includePaths: block.includePaths,
					sourceName: block.sourceName,
					logger,
				}),
		});
		return renderedHtml(pages, alt);
	} catch (err) {
		if (!options.isDev) throw err;
		return renderedErrorHtml(err, title);
	}
}
