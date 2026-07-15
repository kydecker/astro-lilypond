import { dirname } from "path";
import { fileURLToPath } from "url";

export type OutputFormat = "svg" | "png" | { type: "png"; resolution: number };

export interface LilypondPluginOptions {
	version?: string;
	format?: OutputFormat;
	crop?: boolean;
}

/** Returns true for the fenced-block language identifiers that trigger SVG rendering. */
export function isLilypondLang(lang: string | null | undefined): boolean {
	return lang === "lilypond" || lang === "ly" || lang === "ily";
}

/** Normalises an OutputFormat value into a plain format string and optional resolution (DPI). */
export function resolveFormat(format: OutputFormat): {
	format: "svg" | "png";
	resolution?: number;
} {
	if (typeof format === "string") return { format };
	return { format: format.type, resolution: format.resolution };
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

/** Converts a rendered LilyPond buffer to an HTML string suitable for inline embedding. */
export function renderToHtml(buf: Buffer, format: "svg" | "png"): string {
	if (format === "png") {
		const b64 = buf.toString("base64");
		return `<img class="lilypond" src="data:image/png;base64,${b64}" alt="LilyPond notation">`;
	}
	return buf.toString("utf-8").replace(/<svg\b/, '<svg class="lilypond"');
}
