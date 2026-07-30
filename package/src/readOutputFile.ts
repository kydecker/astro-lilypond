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

/**
 * Multi-page naming convention per format: SVG uses `<base>-1.<ext>`; PNG
 * uses `<base>-page1.<ext>`. `pdf` is listed for type completeness only — a
 * single-book score always renders to one `<base>.pdf`, caught by the
 * `entries.includes(...)` branch above before this table is consulted.
 */
const PAGE_NUMBER_INFIX: Record<Format, string> = {
	svg: "-",
	png: "-page",
	pdf: "-",
};

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

	// Single page → <base>.<format>; multi-page → numbered per PAGE_NUMBER_INFIX.
	const dir = dirname(base);
	const prefix = basename(base);
	const entries = await readdir(dir);

	if (entries.includes(`${prefix}.${format}`)) {
		return [await readFile(join(dir, `${prefix}.${format}`))];
	}

	const pagePattern = new RegExp(
		`^${prefix}${PAGE_NUMBER_INFIX[format]}(\\d+)\\.${format}$`,
	);
	const pages = entries
		.map((name) => name.match(pagePattern))
		.filter((match): match is RegExpMatchArray => match !== null)
		.sort(byPageNumber);
	if (pages.length > 0) {
		return Promise.all(pages.map((match) => readFile(join(dir, match[0]))));
	}

	throw new Error(`no ${format} output found in ${dir}`);
}
