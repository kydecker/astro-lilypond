import { escapeHtmlAttribute } from "./escapeHtmlAttribute.js";

/**
 * Wraps a rendered score's page URLs in the markup embedded in the page.
 * A single page is a plain `<img>`; multiple pages are wrapped in an
 * `<ol><li>` so every page renders, in order — screen readers announce list
 * position on their own, so every page gets the same `alt` text rather than
 * a "Page N" suffix. Pass `""` for decorative.
 */
export function renderedHtml(srcs: string[], alt: string): string {
	const escapedAlt = escapeHtmlAttribute(alt);

	if (srcs.length === 1) {
		return `<img data-lilypond-image src="${srcs[0]}" alt="${escapedAlt}">`;
	}

	return `<ol data-lilypond-group>${srcs
		.map(
			(src) =>
				`<li><img data-lilypond-image src="${src}" alt="${escapedAlt}"></li>`,
		)
		.join("")}</ol>`;
}
