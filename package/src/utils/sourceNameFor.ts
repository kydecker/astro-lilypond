import { basename } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Derives `render()`'s `sourceName` from the source file's path or URL, so
 * build output identifies the originating file instead of a generic
 * `input.ly`. Returns `undefined` when the source location is unknown.
 */
export function sourceNameFor(
	source: string | URL | null | undefined,
): string | undefined {
	if (!source) return undefined;
	const path = typeof source === "string" ? source : fileURLToPath(source);
	return basename(path);
}
