import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execLilyPond } from "./execLilyPond.js";
import { readOutputFile, safeInputFileName } from "./readOutputFile.js";
import type { LilypondVersion } from "./types/lilypondVersion.js";
import { resolveDefaults } from "./utils/resolveDefaults.js";

export const FORMATS = ["png", "svg"] as const;

export type Format = (typeof FORMATS)[number];

/**
 * Controls whether rendered output is cropped tightly to the content
 * bounding box, or left as full, potentially multi-page, output.
 *
 * - `true` — crop everywhere: Markdown fences and `<LilyPond>` `.ly` imports.
 * - `false` — never crop by default (a `.ly` import can still opt in with
 *   `?crop`).
 * - `"markdown-only"` — crop Markdown fences, but leave `<LilyPond>` `.ly`
 *   imports uncropped unless the import opts in with `?crop`.
 */
export type CropSetting = boolean | "markdown-only";

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
	version?: LilypondVersion;

	/**
	 * Resolution in DPI (only applies to PNG).
	 * @default 144
	 */
	resolution?: number;

	/**
	 * Crop the output tightly to the content bounding box, producing one
	 * continuous image instead of paginated output.
	 * @default "markdown-only"
	 */
	crop?: CropSetting;
}

export interface RenderOptions {
	/**
	 * Output format.
	 * @default "svg"
	 */
	format?: Format;

	/**
	 * Crop the output tightly to the content bounding box, producing one
	 * continuous image instead of paginated output. Disable for full-page,
	 * potentially multi-page output.
	 * @default true
	 */
	crop?: boolean;

	/**
	 * Defaults for rendering each score. `version` is not read here — it's
	 * applied earlier, by prepending it to the source text before it
	 * reaches `render()`.
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
	crop: true,
	binaryPath: "lilypond",
	timeout: 60_000,
	defaults: {
		version: "2.26.0",
		resolution: 144,
		crop: "markdown-only",
	},
};

export async function render(
	source: string,
	options: RenderOptions = {},
): Promise<Buffer[]> {
	const {
		format = defaultOptions.format,
		crop = defaultOptions.crop,
		binaryPath = defaultOptions.binaryPath,
		timeout = defaultOptions.timeout,
		includePaths = [],
		sourceName,
	} = options;

	const { resolution } = resolveDefaults(options.defaults);

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
			crop,
			resolution,
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
