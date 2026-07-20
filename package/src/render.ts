import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execLilyPond } from "./execLilyPond.js";
import { readOutputFile, safeInputFileName } from "./readOutputFile.js";

const FORMATS = ["png", "svg"] as const;

export type Format = (typeof FORMATS)[number];

export interface RenderOptions {
	/** Output format. Defaults to `"svg"`. */
	format?: Format;

	/** Resolution in DPI (only applies to PNG). Defaults to `144`. */
	resolution?: number;

	/** Path to the `lilypond` binary. Defaults to `"lilypond"`. */
	binaryPath?: string;

	/**
	 * Crop the output tightly to the content bounding box.
	 * Disable if full-page renders are preferred.
	 * Defaults to `true`.
	 */
	crop?: boolean;

	/**
	 * Extra directories LilyPond should search for `\include`d files.
	 * Typically the directory containing the source `.ly`/Markdown file.
	 */
	includePaths?: string[];

	/**
	 * Base name to give the temp input file passed to LilyPond, so build
	 * output (e.g. `Processing "bach-schenker.ly"`). Falls back to
	 * `"input.ly"` when omitted or unsafe to use as a filename.
	 */
	sourceName?: string;

	/**
	 * Milliseconds to wait for a single `lilypond` invocation before
	 * aborting it, so a pathological score can't hang the build forever.
	 * Defaults to `60000` (60s).
	 */
	timeout?: number;
}

export const defaultOptions: Required<
	Omit<RenderOptions, "includePaths" | "sourceName">
> = {
	format: "svg",
	resolution: 144,
	binaryPath: "lilypond",
	crop: true,
	timeout: 60_000,
};

export async function render(
	source: string,
	options: RenderOptions = {},
): Promise<Buffer> {
	const {
		format = defaultOptions.format,
		resolution = defaultOptions.resolution,
		binaryPath = defaultOptions.binaryPath,
		crop = defaultOptions.crop,
		timeout = defaultOptions.timeout,
		includePaths = [],
		sourceName,
	} = options;

	if (!FORMATS.includes(format)) {
		throw new Error(`${format} is not a supported format`);
	}

	const dir = await mkdtemp(join(tmpdir(), "astro-lilypond-"));
	const inputPath = join(dir, safeInputFileName(sourceName));
	const outputBase = join(dir, "output");

	try {
		await writeFile(inputPath, source, "utf8");

		await execLilyPond({
			binaryPath,
			format,
			resolution,
			crop,
			includePaths,
			timeout,
			inputPath,
			outputBase,
		});

		return await readOutputFile(outputBase, format, crop);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
