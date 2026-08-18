import { addAttribute } from "astro/runtime/server/index.js";
import type { LilypondPage } from "../index.js";

function imgTag(page: LilypondPage, alt: string, imageAttrs: string): string {
	return `<img data-lilypond-image${addAttribute(page.src, "src")}${addAttribute(page.width, "width")}${addAttribute(page.height, "height")}${addAttribute(alt, "alt")}${imageAttrs}>`;
}

export interface RenderedHtmlOptions {
	/** Class applied to the outer `<img>` or `<ol>` tag. */
	class?: string;
	/** Inline styles applied to the outer `<img>` or `<ol>`. */
	style?: string;
	/** Render only the first `n` pages. */
	pageLimit?: number;
	/**
	 * `loading` hint forwarded onto every rendered `<img>`. Set `"lazy"` so
	 * off-screen scores in a list don't fetch until scrolled near, or `"eager"`
	 * (with `fetchpriority="high"`) for an above-the-fold/LCP score.
	 */
	loading?: "lazy" | "eager";
	/**
	 * `decoding` hint forwarded onto every rendered `<img>`. `"async"` keeps
	 * image decoding off the main thread.
	 */
	decoding?: "async" | "sync" | "auto";
	/**
	 * `fetchpriority` hint forwarded onto every rendered `<img>`. `"high"` for
	 * an above-the-fold/LCP score, `"low"` to defer a below-the-fold score.
	 */
	fetchpriority?: "high" | "low" | "auto";
	/**
	 * Convenience for an above-the-fold/LCP score: sets `loading="eager"`,
	 * `decoding="sync"`, `fetchpriority="high"` — the same defaults Astro's
	 * `<Image>` derives from its `priority` prop. Any of `loading`/`decoding`/
	 * `fetchpriority` you pass explicitly take precedence over these.
	 */
	priority?: boolean;
}

export function renderedHtml(
	pages: LilypondPage[],
	alt: string,
	options: RenderedHtmlOptions = {},
): string {
	const {
		class: className,
		style,
		pageLimit,
		loading,
		decoding,
		fetchpriority,
		priority,
	} = options;
	const limitedPages =
		pageLimit === undefined ? pages : pages.slice(0, pageLimit);
	if (limitedPages.length === 0) return "";

	const classAttr = addAttribute(className, "class");
	const styleAttr = addAttribute(style, "style");

	// Per-image fetch/decode hints, forwarded onto every rendered <img>
	// (single-page and each page in a multi-page <ol>). `priority` only fills
	// the hints that aren't already set, mirroring `<Image>`'s `??` behaviour.
	const resolvedLoading = loading ?? (priority ? "eager" : undefined);
	const resolvedDecoding = decoding ?? (priority ? "sync" : undefined);
	const resolvedFetchpriority =
		fetchpriority ?? (priority ? "high" : undefined);
	const imageAttrs =
		addAttribute(resolvedLoading, "loading") +
		addAttribute(resolvedDecoding, "decoding") +
		addAttribute(resolvedFetchpriority, "fetchpriority");

	if (limitedPages.length === 1) {
		const page = limitedPages[0];
		return `<img data-lilypond-image${classAttr}${addAttribute(page.src, "src")}${addAttribute(page.width, "width")}${addAttribute(page.height, "height")}${addAttribute(alt, "alt")}${imageAttrs}${styleAttr}>`;
	}

	return `<ol data-lilypond-group${classAttr}${styleAttr}>${limitedPages
		.map((page) => `<li>${imgTag(page, alt, imageAttrs)}</li>`)
		.join("")}</ol>`;
}
