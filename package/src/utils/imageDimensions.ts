import type { Format } from "../render.js";

export interface ImageDimensions {
	width: number;
	height: number;
}

const PNG_SIGNATURE = Buffer.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function svgDimensions(buf: Buffer): ImageDimensions | undefined {
	// Not anchored to the start of the string: LilyPond prefixes SVG output
	// with an `<?xml ... ?>` declaration, so the root element isn't at offset
	// 0. `.match` without the `g` flag only returns this first match, i.e.
	// the root `<svg>`, not any nested element.
	const openTag = buf.toString("utf8").match(/<svg\b[^>]*>/)?.[0];
	if (!openTag) return undefined;

	const width = openTag.match(/\bwidth="([\d.]+)"/)?.[1];
	const height = openTag.match(/\bheight="([\d.]+)"/)?.[1];
	if (width === undefined || height === undefined) return undefined;

	return {
		width: Math.round(Number(width)),
		height: Math.round(Number(height)),
	};
}

// PNG dimensions live in the IHDR chunk, which is always the first chunk:
// an 8-byte signature, then a 4-byte length, a 4-byte "IHDR" type, then
// 4-byte big-endian width and height. https://www.w3.org/TR/png/#11IHDR
function pngDimensions(buf: Buffer): ImageDimensions | undefined {
	if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
		return undefined;
	}
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Reads a rendered asset's pixel/CSS-unit dimensions straight from its bytes. */
export function imageDimensionsFor(
	format: Format,
	buf: Buffer,
): ImageDimensions | undefined {
	return format === "svg" ? svgDimensions(buf) : pngDimensions(buf);
}
