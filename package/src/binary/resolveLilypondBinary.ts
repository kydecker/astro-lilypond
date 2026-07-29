import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { LilypondVersion } from "../types/lilypondVersion.js";
import { downloadLilypond } from "./downloadLilypond.js";
import { resolvePlatformTarget } from "./platformTarget.js";

const execFileAsync = promisify(execFile);

/** Version downloaded when `autoInstall.version` isn't set. */
export const DEFAULT_LILYPOND_VERSION: LilypondVersion = "2.26.0";

async function isOnPath(): Promise<boolean> {
	try {
		await execFileAsync("lilypond", ["--version"]);
		return true;
	} catch {
		return false;
	}
}

export interface ResolveLilypondBinaryOptions {
	/**
	 * LilyPond version to install if none is found on `PATH`. Unrelated to
	 * `defaults.version` (which scores are compiled against) — this is only
	 * which release gets downloaded.
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
 * always wins — a manual install (matching the project's own version, or
 * simply the one the user wants) is never shadowed by a downloaded one.
 * Otherwise, when `autoInstall` is enabled, downloads a platform-matched
 * build into a local cache and returns its path. Falls back to the bare
 * `"lilypond"` command (which will fail loudly at render time) whenever a
 * binary can't be found or installed, after logging a warning explaining
 * why.
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
		warn(
			`astro-lilypond: automatic LilyPond download failed — ${err instanceof Error ? err.message : String(err)}. ` +
				"Install LilyPond manually and ensure it is on PATH.",
		);
		return "lilypond";
	}
}
