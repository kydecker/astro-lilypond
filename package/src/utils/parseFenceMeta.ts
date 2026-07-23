import { unescapeQuoted } from "./unescapeQuoted.js";

const ALT_PATTERN = /(?:^|\s)alt="((?:[^"\\]|\\.)*)"/;

/**
 * Extracts `alt="..."` from a fenced code block's meta string (e.g.
 * ```lilypond alt="Sonata"). `undefined` means absent (including malformed
 * quoting); `""` means explicitly forced empty.
 */
export function parseFenceMeta(
	meta: string | null | undefined,
): string | undefined {
	if (!meta) return undefined;
	const match = ALT_PATTERN.exec(meta);
	if (!match) return undefined;
	return unescapeQuoted(match[1]);
}
