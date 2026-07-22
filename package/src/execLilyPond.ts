import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Format } from "./render.js";

const execFileAsync = promisify(execFile);

const MAX_BUFFER = 16 * 1024 * 1024; // 16 MiB

export interface ExecLilypondOptions {
	binaryPath: string;
	format: Format;
	crop: boolean;
	resolution: number;
	includePaths: string[];
	timeout: number;
	inputPath: string;
	outputBase: string;
}

/**
 * Invokes the `lilypond` binary against an already-written input file.
 * Resolves once compilation succeeds (surfacing any stderr warnings to the
 * build output); throws a normalized Error on a non-zero exit or timeout.
 */
export async function execLilyPond(
	options: ExecLilypondOptions,
): Promise<void> {
	const {
		binaryPath,
		format,
		crop,
		resolution,
		includePaths,
		timeout,
		inputPath,
		outputBase,
	} = options;

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

	// LilyPond writes its progress log, (and any warnings/errors) to stderr,
	// even on success. surface it in the build output so it's visible,
	// but let the exit code (not stderr content) decide pass/fail.
	let stderr: string;
	try {
		({ stderr } = await execFileAsync(binaryPath, args, {
			signal: AbortSignal.timeout(timeout),
			maxBuffer: MAX_BUFFER,
		}));
	} catch (err) {
		if (
			err &&
			typeof err === "object" &&
			(err as { name?: string }).name === "AbortError"
		) {
			throw new Error(`lilypond timed out after ${timeout}ms`);
		}
		const errStderr =
			err && typeof err === "object" && "stderr" in err
				? String((err as { stderr: unknown }).stderr)
				: undefined;
		if (errStderr) process.stderr.write(errStderr);
		throw new Error(
			errStderr || (err instanceof Error ? err.message : String(err)),
		);
	}
	if (stderr) process.stderr.write(stderr);
}
