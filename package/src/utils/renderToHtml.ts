const MIME_TYPES = {
	svg: "image/svg+xml",
	png: "image/png",
} as const;

/**
 * Converts a rendered LilyPond buffer to an HTML string.
 */
export function renderToHtml(buf: Buffer, format: "svg" | "png"): string {
	const b64 = buf.toString("base64");
	return `<img class="lilypond" src="data:${MIME_TYPES[format]};base64,${b64}" alt="">`;
}
