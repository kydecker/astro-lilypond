import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
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

/** Sorts by the numeric page captured in `match[1]`, ascending. */
function byPageNumber(a: RegExpMatchArray, b: RegExpMatchArray): number {
	return Number(a[1]) - Number(b[1]);
}

export async function readOutputFile(
	base: string,
	format: Format,
	crop: boolean,
): Promise<Buffer[]> {
	// --define-default crop writes <base>.cropped.<format> alongside <base>.<format>
	if (crop) {
		try {
			return [await readFile(`${base}.cropped.${format}`)];
		} catch (err) {
			throw new Error(
				`expected cropped output at ${base}.cropped.${format} but it was not found: ${
					err instanceof Error ? err.message : String(err)
				}`,
			);
		}
	}

	// Regular output: single page → <base>.<format>, multi-page →
	// <base>-1.<format>, <base>-2.<format>, ... (svg/pdf) or
	// <base>-page1.<format>, <base>-page2.<format>, ... (png). List the
	// directory once rather than probing candidate paths one at a time, so
	// the full page count is known up front instead of guessed at.
	const dir = dirname(base);
	const prefix = basename(base);
	const entries = await readdir(dir);

	if (entries.includes(`${prefix}.${format}`)) {
		return [await readFile(join(dir, `${prefix}.${format}`))];
	}

	const numberedPattern = new RegExp(`^${prefix}-(\\d+)\\.${format}$`);
	const numbered = entries
		.map((name) => name.match(numberedPattern))
		.filter((match): match is RegExpMatchArray => match !== null)
		.sort(byPageNumber);
	if (numbered.length > 0) {
		return Promise.all(numbered.map((match) => readFile(join(dir, match[0]))));
	}

	const pagedPattern = new RegExp(`^${prefix}-page(\\d+)\\.${format}$`);
	const paged = entries
		.map((name) => name.match(pagedPattern))
		.filter((match): match is RegExpMatchArray => match !== null)
		.sort(byPageNumber);
	if (paged.length > 0) {
		return Promise.all(paged.map((match) => readFile(join(dir, match[0]))));
	}

	throw new Error(`no ${format} output found in ${dir}`);
}
