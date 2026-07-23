const ALT_PATTERN = /\balt="((?:[^"\\]|\\.)*)"/;

/**
 * Extracts `alt="..."` from a fenced code block's meta string (the text
 * after the language tag, e.g. ```lilypond alt="Sonata"). Returns
 * `undefined` when no `alt=` attribute is present — including malformed or
 * unterminated quoting, which is treated the same as absent rather than an
 * error — and the empty string when `alt=""` is explicitly given, so a
 * caller can distinguish "not provided" from "explicitly forced empty".
 *
 * Intentionally narrower than Expressive Code's full meta grammar (no bare
 * flags, no single-quote/regex/brace delimiters) since `alt` is the only
 * meta attribute this integration currently recognizes.
 */
export function parseFenceMeta(
	meta: string | null | undefined,
): string | undefined {
	if (!meta) return undefined;
	const match = ALT_PATTERN.exec(meta);
	if (!match) return undefined;
	return match[1].replace(/\\(["\\])/g, "$1");
}
