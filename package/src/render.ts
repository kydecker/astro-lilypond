import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AstroIntegrationLogger } from "astro";
import { execLilyPond } from "./execLilyPond.js";
import { readOutputFile, safeInputFileName } from "./readOutputFile.js";
import type { LilypondVersion } from "./types/lilypondVersion.js";
import { resolveDefaults } from "./utils/resolveDefaults.js";

export const FORMATS = ["png", "svg", "pdf"] as const;

export type Format = (typeof FORMATS)[number];

/**
 * Defaults passed to each score for rendering.
 */
export interface LilypondDefaults {
	/**
	 * LilyPond version to use for every block that
	 * doesn't already declare `\version`.
	 * @default "2.26.0"
	 */
	version?: LilypondVersion;

	/**
	 * Output format.
	 * @default "svg"
	 */
	format?: "svg" | "png";

	/**
	 * Resolution in DPI (only applies to PNG).
	 * @default 144
	 */
	resolution?: number;

	/**
	 * Multiplies the `width`/`height` on a cropped score's `<img>` tag.
	 * Helps compensate for LilyPond's internal size units (points/mm)
	 * appearing too small when converted to pixels. Only affects the `<img>`
	 * dimensions on the page; rendered files are not affected.
	 * Has no effect on uncropped (paginated) output.
	 * @default 1.5
	 */
	cropScale?: number;
}

/**
 * The subset of `LilypondDefaults` that `render()` itself reads. `version`
 * and `format` are resolved by the caller before reaching `render()`.
 */
export type RenderDefaults = Omit<LilypondDefaults, "version" | "format">;

export interface InternalRenderOptions {
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
	 * Defaults for rendering each score. `version` and `crop` aren't read
	 * here — see `RenderDefaults`.
	 */
	defaults?: RenderDefaults;

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

	/**
	 * Warning and failure logging from LilyPond.
	 */
	logger: Pick<AstroIntegrationLogger, "warn" | "error">;
}

const defaultLilypondDefaults: Required<LilypondDefaults> = {
	version: "2.26.0",
	format: "svg",
	resolution: 144,
	cropScale: 1.5,
};

export const defaultOptions: Required<
	Omit<
		InternalRenderOptions,
		"includePaths" | "sourceName" | "defaults" | "logger"
	>
> & { defaults: Required<LilypondDefaults> } = {
	format: defaultLilypondDefaults.format,
	crop: true,
	binaryPath: "lilypond",
	timeout: 60_000,
	defaults: defaultLilypondDefaults,
};

export async function render(
	source: string,
	options: InternalRenderOptions,
): Promise<Buffer[]> {
	const {
		format = defaultOptions.format,
		crop = defaultOptions.crop,
		binaryPath = defaultOptions.binaryPath,
		timeout = defaultOptions.timeout,
		includePaths = [],
		sourceName,
		logger,
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
			logger,
		});

		return await readOutputFile(outputBase, format, crop);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
