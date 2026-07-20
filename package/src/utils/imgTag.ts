/**
 * Wraps a rendered score's URL in the `<img>` markup embedded in the page.
 */
export function imgTag(src: string): string {
	return `<img class="lilypond" src="${src}" alt="">`;
}
