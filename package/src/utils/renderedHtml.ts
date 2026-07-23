/**
 * Wraps a rendered score's page URLs in the markup embedded in the page.
 * A single page is a plain `<img>`; multiple pages are wrapped in an
 * `<ol><li>` so every page renders, in order.
 */
export function renderedHtml(srcs: string[]): string {
	if (srcs.length === 1) {
		return `<img data-lilypond-image src="${srcs[0]}" alt="">`;
	}

	return `<ol data-lilypond-group>${srcs
		.map((src) => `<li><img data-lilypond-image src="${src}" alt=""></li>`)
		.join("")}</ol>`;
}
