import { addAttribute } from "astro/runtime/server/index.js";
import type { HTMLAttributes } from "astro/types";
import type { LilypondPage } from "../index.js";

function imgTag(page: LilypondPage, alt: string, imageAttrs: string): string {
	return `<img data-lilypond-image${addAttribute(page.src, "src")}${addAttribute(page.width, "width")}${addAttribute(page.height, "height")}${addAttribute(alt, "alt")}${imageAttrs}>`;
}

export interface RenderedHtmlOptions
	extends Partial<
		Pick<
			HTMLAttributes<"img">,
			"alt" | "loading" | "decoding" | "fetchpriority"
		>
	> {
	/** Class applied to the outer `<img>` or `<ol>` tag. */
	class?: string;
	/** Inline styles applied to the outer `<img>` or `<ol>`. */
	style?: string;
	/** Render only the first `n` pages. */
	pageLimit?: number;
}

export function renderedHtml(
	pages: LilypondPage[],
	options: RenderedHtmlOptions = {},
): string {
	const {
		alt,
		class: className,
		style,
		pageLimit,
		loading,
		decoding,
		fetchpriority,
	} = options;
	const resolvedAlt = alt ?? "";
	const limitedPages =
		pageLimit === undefined ? pages : pages.slice(0, pageLimit);
	if (limitedPages.length === 0) return "";

	const classAttr = addAttribute(className, "class");
	const styleAttr = addAttribute(style, "style");
	const imageAttrs =
		addAttribute(loading, "loading") +
		addAttribute(decoding, "decoding") +
		addAttribute(fetchpriority, "fetchpriority");

	if (limitedPages.length === 1) {
		const page = limitedPages[0];
		return `<img data-lilypond-image${classAttr}${addAttribute(page.src, "src")}${addAttribute(page.width, "width")}${addAttribute(page.height, "height")}${addAttribute(resolvedAlt, "alt")}${imageAttrs}${styleAttr}>`;
	}

	return `<ol data-lilypond-group${classAttr}${styleAttr}>${limitedPages
		.map((page) => `<li>${imgTag(page, resolvedAlt, imageAttrs)}</li>`)
		.join("")}</ol>`;
}
