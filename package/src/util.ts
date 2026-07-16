import { basename, dirname } from "path";
import { fileURLToPath } from "url";

export interface LilypondPluginOptions {
	version?: string;
	format?: "svg" | "png";
	resolution?: number;
	crop?: boolean;
}

/** Returns true for the fenced-block language identifiers that trigger SVG rendering. */
export function isLilypondLang(lang: string | null | undefined): boolean {
	return lang === "lilypond" || lang === "ly" || lang === "ily";
}

/**
 * If `version` is provided and the source doesn't already declare `\version`,
 * prepend `\version "X.X.X"` so users don't need to write it manually.
 */
export function prependVersion(source: string, version: string): string {
	if (/\\version\b/.test(source)) return source;
	return `\\version "${version}"\n${source}`;
}

/**
 * Derives `render()`'s `includePaths` from the source file's path or URL, so
 * `\include`d sibling files resolve even though rendering happens in a temp
 * directory. Returns `[]` when the source location is unknown.
 */
export function includePathsFor(source: string | URL | null | undefined): string[] {
	if (!source) return [];
	const path = typeof source === "string" ? source : fileURLToPath(source);
	return [dirname(path)];
}

/**
 * Derives `render()`'s `sourceName` from the source file's path or URL, so
 * build output identifies the originating file instead of a generic
 * `input.ly`. Returns `undefined` when the source location is unknown.
 */
export function sourceNameFor(source: string | URL | null | undefined): string | undefined {
	if (!source) return undefined;
	const path = typeof source === "string" ? source : fileURLToPath(source);
	return basename(path);
}

const MIME_TYPES = {
	svg: "image/svg+xml",
	png: "image/png",
} as const;

/**
 * Converts a rendered LilyPond buffer to an HTML string suitable for
 * embedding.
 */
export function renderToHtml(buf: Buffer, format: "svg" | "png"): string {
	const b64 = buf.toString("base64");
	return `<img class="lilypond" src="data:${MIME_TYPES[format]};base64,${b64}" alt="">`;
}
