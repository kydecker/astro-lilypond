import { basename, extname } from "node:path";

const UNSAFE_CHARS = /[^a-zA-Z0-9_-]+/g;

/**
 * Derives a human-readable, filename-safe title from `sourceNameFor()`'s
 * output, for use as the middle segment of a rendered asset's filename
 * (`<hash>.<title>.<ext>`). Falls back to `"score"` when the source
 * location is unknown or sanitizes away to nothing.
 */
export function titleFor(sourceName: string | undefined): string {
	if (!sourceName) return "score";
	const stem = basename(sourceName, extname(sourceName));
	const safe = stem
		.replace(UNSAFE_CHARS, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
	return safe || "score";
}
