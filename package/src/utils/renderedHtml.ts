import type { LilypondPage } from "../index.js";
import { escapeHtmlAttribute } from "./escapeHtmlAttribute.js";

function sizeAttrs(page: LilypondPage): string {
	return page.width !== undefined && page.height !== undefined
		? ` width="${page.width}" height="${page.height}"`
		: "";
}

function attr(name: string, value: string | undefined): string {
	return value === undefined ? "" : ` ${name}="${escapeHtmlAttribute(value)}"`;
}

function imgTag(page: LilypondPage, escapedAlt: string): string {
	return `<img data-lilypond-image src="${page.src}"${sizeAttrs(page)} alt="${escapedAlt}">`;
}

export interface RenderedHtmlOptions {
	/** Applied to the single `<img>`, or the wrapping `<ol>` for a multi-page group — never to individual `<li><img>`s. */
	class?: string;
	/** Same placement as `class` — the single `<img>`, or the wrapping `<ol>`. */
	style?: string;
	/** Render only the first `n` pages. */
	pageLimit?: number;
}

export function renderedHtml(
	pages: LilypondPage[],
	alt: string,
	options: RenderedHtmlOptions = {},
): string {
	const { class: className, style, pageLimit } = options;
	const limitedPages =
		pageLimit === undefined ? pages : pages.slice(0, pageLimit);
	if (limitedPages.length === 0) return "";

	const escapedAlt = escapeHtmlAttribute(alt);
	const classAttr = attr("class", className);
	const styleAttr = attr("style", style);

	if (limitedPages.length === 1) {
		const page = limitedPages[0];
		return `<img data-lilypond-image${classAttr} src="${page.src}"${sizeAttrs(page)} alt="${escapedAlt}"${styleAttr}>`;
	}

	return `<ol data-lilypond-group${classAttr}${styleAttr}>${limitedPages
		.map((page) => `<li>${imgTag(page, escapedAlt)}</li>`)
		.join("")}</ol>`;
}
