import { escapeHtmlAttribute } from "./escapeHtmlAttribute.js";

export interface RenderedPage {
	url: string;
	width?: number;
	height?: number;
}

/** Builds one `<img>` tag, including `width`/`height` when known, to avoid layout shift on load. */
function imgTag(page: RenderedPage, escapedAlt: string): string {
	const size =
		page.width !== undefined && page.height !== undefined
			? ` width="${page.width}" height="${page.height}"`
			: "";
	return `<img data-lilypond-image src="${page.url}"${size} alt="${escapedAlt}">`;
}

/**
 * Wraps a rendered score's pages in the markup embedded in the page.
 * A single page is a plain `<img>`; multiple pages are wrapped in an
 * `<ol><li>` so every page renders, in order — screen readers announce list
 * position on their own, so every page gets the same `alt` text rather than
 * a "Page N" suffix. Pass `""` for decorative.
 */
export function renderedHtml(pages: RenderedPage[], alt: string): string {
	const escapedAlt = escapeHtmlAttribute(alt);

	if (pages.length === 1) {
		return imgTag(pages[0], escapedAlt);
	}

	return `<ol data-lilypond-group>${pages
		.map((page) => `<li>${imgTag(page, escapedAlt)}</li>`)
		.join("")}</ol>`;
}
