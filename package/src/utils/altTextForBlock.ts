import { altTextFor } from "./altTextFor.js";
import { parseFenceMeta } from "./parseFenceMeta.js";
import { parseLyHeader } from "./parseLyHeader.js";

/** Alt text for a fenced code block: a meta `alt="..."` override, else derived from the block's `\header` title/composer. */
export function altTextForBlock(
	meta: string | null | undefined,
	source: string,
): string {
	return parseFenceMeta(meta) ?? altTextFor(parseLyHeader(source));
}
