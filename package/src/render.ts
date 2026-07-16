import { execFile } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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
}

export const defaultOptions: Required<Omit<RenderOptions, "includePaths">> = {
	format: "svg",
	resolution: 144,
	binaryPath: "lilypond",
	crop: true,
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
		includePaths = [],
	} = options;

	if (!FORMATS.includes(format)) {
		throw new Error(`${format} is not a supported format`);
	}

	const dir = await mkdtemp(join(tmpdir(), "astro-lilypond-"));
	const inputPath = join(dir, "input.ly");
	const outputBase = join(dir, "output");

	try {
		await writeFile(inputPath, source, "utf8");

		const args = [
			// Render the correct format
			`--format=${format}`,

			// Define defaults — these can be overridden with the appropriate flags
			// inside of individual .ly files

			// Disable point-and-click behavior on SVGs when clicking noteheads
			"--define-default=no-point-and-click",
			// Use the `cairo` backend for graphics rendering; faster than the default `ps` backend
			// https://lilypond.org/doc/v2.26/Documentation/usage/advanced-command_002dline-options-for-lilypond
			"--define-default=backend=cairo",
			// Resolution for generating PNGs (set in DPI)
			`--define-default=resolution=${resolution}`,
			// Set cropping
			`--define-default=crop=${crop ? "#t" : "#f"}`,

			// If the LilyPond file imports from others via \include, make sure those files are included
			...includePaths.map((p) => `--include=${p}`),

			"--output",
			outputBase,
			inputPath,
		];

		// LilyPond writes its progress log, and any warnings/errors, to stderr
		// even on success — surface it in the build output so it's visible,
		// but let the exit code (not stderr content) decide pass/fail.
		let stderr: string;
		try {
			({ stderr } = await execFileAsync(binaryPath, args));
		} catch (err) {
			const errStderr =
				err && typeof err === "object" && "stderr" in err
					? String((err as { stderr: unknown }).stderr)
					: undefined;
			if (errStderr) process.stderr.write(errStderr);
			throw new Error(errStderr || (err instanceof Error ? err.message : String(err)));
		}
		if (stderr) process.stderr.write(stderr);

		return await readOutputFile(outputBase, format, crop);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function readOutputFile(
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
