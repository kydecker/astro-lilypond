import { execFile } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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
}

export const defaultOptions: Required<RenderOptions> = {
	format: "svg",
	resolution: 144,
	binaryPath: "lilypond",
	crop: true,
};

export async function render(
	source: string,
	options: RenderOptions = {},
): Promise<Buffer> {
	const opts = { ...defaultOptions, ...options };

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
			"--define-default",
			`resolution=${opts.resolution ?? 144}`,
			"--define-default",
			"no-point-and-click",
			...(opts.crop ? ["--define-default", "crop"] : []),
			"--silent",
			"--output",
			outputBase,
			inputPath,
		].filter((a): a is string => a !== null);

		const { stderr } = await execFileAsync(
			opts.binaryPath ?? "lilypond",
			args,
		);

		if (stderr) throw new Error(stderr);

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
		} catch {
			// cropped output not present; fall through to standard path
		}
	}

	// Regular output: single page → <base>.<format>, multi-page → <base>-1.<format>
	try {
		return await readFile(`${base}.${format}`);
	} catch {
		return await readFile(`${base}-1.${format}`);
	}
}
