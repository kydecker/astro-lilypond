/**
 * If `version` is provided and the source doesn't already declare `\version`,
 * prepend `\version "X.X.X"` so users don't need to write it manually.
 */
export function prependVersion(source: string, version: string): string {
	if (/\\version\b/.test(source)) return source;
	return `\\version "${version}"\n${source}`;
}
