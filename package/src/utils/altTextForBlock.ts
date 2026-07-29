import { altTextFor } from "./altTextFor.js";
import { parseFenceMeta } from "./parseFenceMeta.js";
import { parseLyHeader } from "./parseLyHeader.js";

export function altTextForBlock(
	meta: string | null | undefined,
	source: string,
): string {
	return parseFenceMeta(meta) ?? altTextFor(parseLyHeader(source));
}
