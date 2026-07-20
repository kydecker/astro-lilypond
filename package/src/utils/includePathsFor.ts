import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Derives `render()`'s `includePaths` from the source file's path or URL, so
 * `\include`d sibling files resolve even though rendering happens in a temp
 * directory. Returns `[]` when the source location is unknown.
 */
export function includePathsFor(
	source: string | URL | null | undefined,
): string[] {
	if (!source) return [];
	const path = typeof source === "string" ? source : fileURLToPath(source);
	return [dirname(path)];
}
