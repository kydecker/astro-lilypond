import { createHash } from "node:crypto";
import type { PaperSize } from "../paperSizes.js";
import type { Format } from "../render.js";

const HASH_LENGTH = 6;

export interface ContentHashInput {
	source: string;
	format: Format;
	resolution: number;
	crop: boolean;
	staffSize: number;
	paperSize: PaperSize;
}

/**
 * Derives a content-addressed hash for a rendered score (the first segment
 * of its `<hash>.<title>.<ext>` filename), so identical source/options reuse
 * the same output file (skipping a redundant `lilypond` invocation) and any
 * change produces a new, cache-safe filename.
 *
 * Deliberately does not cover `\include`d file contents or the `lilypond`
 * binary version — an included file changing, or a LilyPond upgrade,
 * won't bust the cache. Accepted v1 tradeoff; clear the output directory
 * to force a full re-render after either.
 */
export function contentHashFor(input: ContentHashInput): string {
	const { source, format, resolution, crop, staffSize, paperSize } = input;
	return createHash("sha256")
		.update(
			JSON.stringify([source, format, resolution, crop, staffSize, paperSize]),
		)
		.digest("hex")
		.slice(0, HASH_LENGTH);
}
