import { addAttribute } from "astro/runtime/server/index.js";
import type { LilypondPage } from "../index.js";

function imgTag(page: LilypondPage, alt: string): string {
	return `<img data-lilypond-image${addAttribute(page.src, "src")}${addAttribute(page.width, "width")}${addAttribute(page.height, "height")}${addAttribute(alt, "alt")}>`;
}

export interface RenderedHtmlOptions {
	/** Class applied to the outer `<img>` or `<ol>` tag. */
	class?: string;
	/** Inline styles applied to the outer `<img>` or `<ol>`. */
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

	const classAttr = addAttribute(className, "class");
	const styleAttr = addAttribute(style, "style");

	if (limitedPages.length === 1) {
		const page = limitedPages[0];
		return `<img data-lilypond-image${classAttr}${addAttribute(page.src, "src")}${addAttribute(page.width, "width")}${addAttribute(page.height, "height")}${addAttribute(alt, "alt")}${styleAttr}>`;
	}

	return `<ol data-lilypond-group${classAttr}${styleAttr}>${limitedPages
		.map((page) => `<li>${imgTag(page, alt)}</li>`)
		.join("")}</ol>`;
}
