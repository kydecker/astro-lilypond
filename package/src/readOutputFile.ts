import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { Format } from "./render.js";

/**
 * Resolves the base name to use for the temp input file. Strips any
 * directory components from `sourceName` (it may be a full path) and
 * rejects anything that isn't a plain, safe file name, falling back to
 * the generic `"input.ly"`.
 */
export function safeInputFileName(sourceName: string | undefined): string {
	if (!sourceName) return "input.ly";
	const base = basename(sourceName);
	if (!base || base === "." || base === ".." || !/^[\w.-]+$/.test(base)) {
		return "input.ly";
	}
	return base;
}

export async function readOutputFile(
	base: string,
	format: Format,
	crop: boolean,
): Promise<Buffer> {
	// --define-default crop writes <base>.cropped.<format> alongside <base>.<format>
	if (crop) {
		try {
			return await readFile(`${base}.cropped.${format}`);
		} catch (err) {
			throw new Error(
				`expected cropped output at ${base}.cropped.${format} but it was not found: ${
					err instanceof Error ? err.message : String(err)
				}`,
			);
		}
	}

	// Regular output: single page → <base>.<format>, multi-page →
	// <base>-1.<format> (svg) or <base>-page1.<format> (png).
	try {
		return await readFile(`${base}.${format}`);
	} catch {
		try {
			return await readFile(`${base}-1.${format}`);
		} catch {
			return await readFile(`${base}-page1.${format}`);
		}
	}
}
