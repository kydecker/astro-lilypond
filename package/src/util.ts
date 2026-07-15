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

const HTML_ENTITIES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

export function escapeHtml(text: unknown): string {
	return String(text).replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] ?? c);
}

/**
 * If `version` is provided and the source doesn't already declare `\version`,
 * prepend `\version "X.X.X"` so users don't need to write it manually.
 */
export function prependVersion(source: string, version: string): string {
	if (/\\version\b/.test(source)) return source;
	return `\\version "${version}"\n${source}`;
}

/** Converts a rendered LilyPond buffer to an HTML string suitable for inline embedding. */
export function renderToHtml(buf: Buffer, format: "svg" | "png"): string {
	if (format === "png") {
		const b64 = buf.toString("base64");
		return `<img class="lilypond" src="data:image/png;base64,${b64}" alt="LilyPond notation">`;
	}
	return buf.toString("utf-8").replace(/<svg\b/, '<svg class="lilypond"');
}

/** Returns a safe HTML string for an error block (no node wrapping). */
export function errorHtml(err: unknown): string {
	const msg = escapeHtml(err instanceof Error ? err.message : String(err));
	return `<div class="lilypond-error" style="color:red;padding:1rem;border:1px solid red;border-radius:0.5rem;font-family:monospace"><strong>LilyPond error:</strong> ${msg}</div>`;
}
