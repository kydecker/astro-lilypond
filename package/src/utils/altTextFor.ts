import type { LyHeaderFields } from "./parseLyHeader.js";

/**
 * Composes alt text from parsed `\header` fields: `"{title}, by {composer}"`
 * when both are present, just the title or `"Sheet music by {composer}"` when
 * only one is, and `""` (decorative) when neither is present.
 */
export function altTextFor(fields: LyHeaderFields): string {
	const { title, composer } = fields;
	if (title && composer) return `${title}, by ${composer}`;
	if (title) return title;
	if (composer) return `Sheet music by ${composer}`;
	return "";
}
