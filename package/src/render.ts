import { execFile } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// LilyPond sometimes hits an internal programming error but recovers and
// still produces valid output (it logs "continuing, cross fingers" and exits
// zero). Complex real-world scores with cross-staff spacing can legitimately
// trigger this, so it shouldn't fail the build on its own.
const BENIGN_STDERR_RE = /^programming error:.*\n^continuing, cross fingers$/gm;

function isBenignStderr(stderr: string): boolean {
	return stderr.replace(BENIGN_STDERR_RE, "").trim() === "";
}

export type Format = "midi" | "pdf" | "ps" | "png" | "svg" | "eps";

const FORMAT_FLAGS: Record<Format, string | null> = {
	midi: null,
	pdf: "--pdf",
	png: "--png",
	ps: "--ps",
	svg: "--svg",
	eps: "--eps",
};

export interface RenderOptions {
	/** Output format. Defaults to `"svg"`. */
	format?: Format;
	/** Resolution in DPI (only applies to PNG). Defaults to `144`. */
	resolution?: number;
	/** Path to the `lilypond` binary. Defaults to `"lilypond"`. */
	binaryPath?: string;
	/**
	 * Crop the output SVG tightly to the content bounding box using
	 * `--define-default crop`. Defaults to `true`.
	 */
	crop?: boolean;
	/**
	 * Extra directories LilyPond should search for `\include`d files, in
	 * addition to its own library (via `-I`). Typically the directory
	 * containing the source `.ly`/Markdown file, so sibling
	 * `\include "foo.ily"` files resolve even though rendering happens in a
	 * temp directory.
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
	const opts = { format, resolution, binaryPath, crop, includePaths };

	if (!(opts.format in FORMAT_FLAGS)) {
		throw new Error(`${opts.format} is not a supported format`);
	}

	const dir = await mkdtemp(join(tmpdir(), "astro-lilypond-"));
	const inputPath = join(dir, "input.ly");
	const outputBase = join(dir, "output");

	try {
		await writeFile(inputPath, source, "utf8");

		const args: string[] = [
			FORMAT_FLAGS[opts.format],
			`--define-default=resolution=${opts.resolution ?? 144}`,
			"--define-default=no-point-and-click",
			...(opts.crop ? ["--define-default=crop"] : []),
			...opts.includePaths.map((p) => `--include=${p}`),
			"--silent",
			"--output",
			outputBase,
			inputPath,
		].filter((a): a is string => a !== null);

		let stderr: string;
		try {
			({ stderr } = await execFileAsync(opts.binaryPath ?? "lilypond", args));
		} catch (err) {
			const errStderr =
				err && typeof err === "object" && "stderr" in err
					? String((err as { stderr: unknown }).stderr)
					: undefined;
			throw new Error(errStderr || (err instanceof Error ? err.message : String(err)));
		}
		if (stderr && !isBenignStderr(stderr)) throw new Error(stderr);

		return await readOutputFile(outputBase, opts.format, opts.crop);
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
	// <base>-1.<format> (svg/pdf/ps/eps) or <base>-page1.<format> (png).
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
