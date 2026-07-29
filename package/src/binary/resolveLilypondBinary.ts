import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { LilypondVersion } from "../types/lilypondVersion.js";
import { downloadLilypond } from "./downloadLilypond.js";
import { resolvePlatformTarget } from "./platformTarget.js";

const execFileAsync = promisify(execFile);

export const DEFAULT_LILYPOND_VERSION: LilypondVersion = "2.26.0";

const IS_ON_PATH_TIMEOUT_MS = 10_000;

/**
 * Only a definite "no such command" (`ENOENT`) counts as "not on PATH" and
 * triggers `autoInstall`. Anything else — a binary that exists but errors,
 * or hangs past the timeout — is treated as present, so it's never silently
 * shadowed by a downloaded copy; it fails at actual render time instead.
 */
async function isOnPath(): Promise<boolean> {
	try {
		await execFileAsync("lilypond", ["--version"], {
			signal: AbortSignal.timeout(IS_ON_PATH_TIMEOUT_MS),
		});
		return true;
	} catch (err) {
		const code = (err as NodeJS.ErrnoException | undefined)?.code;
		return code !== "ENOENT";
	}
}

export interface ResolveLilypondBinaryOptions {
	/**
	 * LilyPond version to install if none is found on `PATH`.
	 * @default DEFAULT_LILYPOND_VERSION
	 */
	version?: LilypondVersion;
	/** Whether to download a matching LilyPond build when it's missing from `PATH`. */
	autoInstall: boolean;
	log?: (message: string) => void;
	warn?: (message: string) => void;
}

/**
 * Resolves the `lilypond` binary to invoke. A binary already on `PATH`
 * always wins. Otherwise, when `autoInstall` is enabled, downloads a
 * platform-matched build into a local cache and returns its path.
 *
 * Declining to install (`autoInstall: false`, or no prebuilt for this
 * platform) falls back to the bare `"lilypond"` command after a warning.
 * An actual install failure (network error, checksum mismatch, corrupt
 * archive) throws instead, rather than deferring one clear error into a
 * confusing failure on every single score.
 */
export async function resolveLilypondBinary({
	version = DEFAULT_LILYPOND_VERSION,
	autoInstall,
	log = () => {},
	warn = () => {},
}: ResolveLilypondBinaryOptions): Promise<string> {
	if (await isOnPath()) return "lilypond";

	if (!autoInstall) {
		warn(
			"astro-lilypond: `lilypond` binary not found on PATH — LilyPond blocks will render as errors. " +
				"Install LilyPond and ensure it is on PATH, or enable the `autoInstall` option (on by default).",
		);
		return "lilypond";
	}

	if (!resolvePlatformTarget()) {
		warn(
			`astro-lilypond: \`lilypond\` binary not found on PATH, and no prebuilt LilyPond ${version} ` +
				`is available for ${process.platform}/${process.arch}. Install LilyPond manually and ensure it is on PATH.`,
		);
		return "lilypond";
	}

	try {
		const binaryPath = await downloadLilypond({ version, log });
		return binaryPath ?? "lilypond";
	} catch (err) {
		throw new Error(
			`astro-lilypond: automatic LilyPond install failed — ${err instanceof Error ? err.message : String(err)}. ` +
				"Install LilyPond manually and ensure it is on PATH, or set `autoInstall: false` to require a PATH install without attempting a download.",
			{ cause: err },
		);
	}
}
