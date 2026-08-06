import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Make sure that any `\include` definitions resolve correctly when
 * LilyPond compiles the score. `source` is the current directory or URL
 * of the .ly file; `extra` is for user-defined locations from the
 * config setting `includePaths`.
 */
export function includePathsFor(
	source: string | URL | null | undefined,
	extra: string[] = [],
): string[] {
	if (!source) return extra;
	const path = typeof source === "string" ? source : fileURLToPath(source);
	return [dirname(path), ...extra];
}
