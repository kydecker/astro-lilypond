import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { LilypondVersion } from "../types/lilypondVersion.js";
import { downloadLilypond } from "./downloadLilypond.js";
import { resolvePlatformTarget } from "./platformTarget.js";

const execFileAsync = promisify(execFile);

export const DEFAULT_LILYPOND_VERSION: LilypondVersion = "2.26.0";

const IS_ON_PATH_TIMEOUT_MS = 10_000;

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
	version?: LilypondVersion;
	autoInstall: boolean;
	log?: (message: string) => void;
	warn?: (message: string) => void;
}

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
