import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execLilyPond } from "./execLilyPond.js";
import type { PaperSize } from "./paperSizes.js";
import { readOutputFile, safeInputFileName } from "./readOutputFile.js";

export const FORMATS = ["png", "svg"] as const;

export type Format = (typeof FORMATS)[number];

/**
 * Defaults passed to each score for rendering.
 * Individual `.ly` files can still override.
 */
export interface LilypondDefaults {
	/**
	 * LilyPond version to use for every block that
	 * doesn't already declare `\version`.
	 * @default "2.26.0"
	 */
	version?: string;

	/**
	 * Resolution in DPI (only applies to PNG).
	 * @default 144
	 */
	resolution?: number;

	/**
	 * Crop the output tightly to the content bounding box.
	 * Enable to trim full-page margins from the output.
	 * @default false
	 */
	crop?: boolean;

	/**
	 * Global staff size, in points.
	 * @default 20
	 */
	staffSize?: number;

	/**
	 * Named paper size.
	 * @default "a4"
	 */
	paperSize?: PaperSize;
}

/**
 * The subset of `LilypondDefaults` passed to the `lilypond` binary itself
 * via `--define-default=<key>=<value>`. Excludes `version`, which is
 * applied earlier by prepending it to the source text.
 */
export type LilypondDefines = Omit<LilypondDefaults, "version">;

export interface RenderOptions {
	/**
	 * Output format.
	 * @default "svg"
	 */
	format?: Format;

	/**
	 * Defaults for rendering each score.
	 */
	defaults?: LilypondDefaults;

	/**
	 * Path to the `lilypond` binary.
	 * @default "lilypond"
	 */
	binaryPath?: string;

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
	 * @default 60000
	 */
	timeout?: number;
}

export const defaultOptions: Required<
	Omit<RenderOptions, "includePaths" | "sourceName" | "defaults">
> & { defaults: Required<LilypondDefaults> } = {
	format: "svg",
	binaryPath: "lilypond",
	timeout: 60_000,
	defaults: {
		version: "2.26.0",
		resolution: 144,
		crop: false,
		staffSize: 20,
		paperSize: "a4",
	},
};

export async function render(
	source: string,
	options: RenderOptions = {},
): Promise<Buffer> {
	const {
		format = defaultOptions.format,
		binaryPath = defaultOptions.binaryPath,
		timeout = defaultOptions.timeout,
		includePaths = [],
		sourceName,
	} = options;

	const defaults: Required<LilypondDefines> = {
		resolution:
			options.defaults?.resolution ?? defaultOptions.defaults.resolution,
		crop: options.defaults?.crop ?? defaultOptions.defaults.crop,
		staffSize: options.defaults?.staffSize ?? defaultOptions.defaults.staffSize,
		paperSize: options.defaults?.paperSize ?? defaultOptions.defaults.paperSize,
	};
	const { crop } = defaults;

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
			defaults,
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
