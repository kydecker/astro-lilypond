import type { Code, Html } from "mdast";
import type {
	MdastPluginDefinition,
	MdastVisitorContext,
} from "satteri";
import { render } from "./render.js";
import { errorHtml, isLilypondLang, prependVersion, renderToHtml, resolveFormat } from "./util.js";
import type { OutputFormat } from "./util.js";

export interface SatteriPluginOptions {
	version?: string;
	format?: OutputFormat;
}

export function satteriLilypondPlugin(
	options: SatteriPluginOptions = {},
): MdastPluginDefinition {
	return {
		name: "astro-lilypond",
		// Returning an mdast Html node (type: 'html') emits the value verbatim.
		// Sätteri's { rawHtml } escape hatch applies MDX brace-escaping which
		// would corrupt SVG content, so we use the plain html node form instead.
		async code(
			node: Readonly<Code>,
			_ctx: MdastVisitorContext,
		): Promise<Html | undefined> {
			if (!isLilypondLang(node.lang)) return undefined;
			const source = options.version
				? prependVersion(node.value, options.version)
				: node.value;
			const { format, resolution } = resolveFormat(options.format ?? "svg");
			try {
				const buf = await render(source, { format, resolution });
				return { type: "html", value: renderToHtml(buf, format) };
			} catch (err) {
				return { type: "html", value: errorHtml(err) };
			}
		},
	};
}
