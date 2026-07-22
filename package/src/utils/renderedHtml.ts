/**
 * Wraps a rendered score's page URLs in the markup embedded in the page.
 * A single page is a plain `<img>`; multiple pages are wrapped in an
 * `<ol><li>` so every page renders, in order.
 */
export function renderedHtml(srcs: string[]): string {
	if (srcs.length === 1) {
		return `<img class="lilypond" src="${srcs[0]}" alt="">`;
	}

	const items = srcs
		.map((src) => `<li><img class="lilypond" src="${src}" alt=""></li>`)
		.join("");
	return `<ol class="lilypond-pages">${items}</ol>`;
}
