/**
 * A platform/arch combination LilyPond publishes a prebuilt archive for,
 * per https://gitlab.com/lilypond/lilypond/-/releases.
 */
export interface PlatformTarget {
	/** LilyPond's own platform token, as used in its release filenames. */
	platform: "linux" | "darwin" | "mingw";
	/** LilyPond's own arch token, as used in its release filenames. */
	arch: "x86_64" | "arm64";
	archiveExt: "tar.gz" | "zip";
	/** Name of the `lilypond` executable inside the archive's `bin/` dir. */
	binaryName: "lilypond" | "lilypond.exe";
}

/**
 * Maps a Node `process.platform`/`process.arch` pair to the matching
 * LilyPond release archive, or `undefined` if LilyPond doesn't publish a
 * prebuilt for that combination (e.g. Linux arm64) — callers should fall
 * back to asking the user to install LilyPond manually in that case.
 */
export function resolvePlatformTarget(
	platform: NodeJS.Platform = process.platform,
	arch: string = process.arch,
): PlatformTarget | undefined {
	if (platform === "linux" && arch === "x64") {
		return {
			platform: "linux",
			arch: "x86_64",
			archiveExt: "tar.gz",
			binaryName: "lilypond",
		};
	}
	if (platform === "darwin" && arch === "arm64") {
		return {
			platform: "darwin",
			arch: "arm64",
			archiveExt: "tar.gz",
			binaryName: "lilypond",
		};
	}
	if (platform === "darwin" && arch === "x64") {
		return {
			platform: "darwin",
			arch: "x86_64",
			archiveExt: "tar.gz",
			binaryName: "lilypond",
		};
	}
	if (platform === "win32" && arch === "x64") {
		return {
			platform: "mingw",
			arch: "x86_64",
			archiveExt: "zip",
			binaryName: "lilypond.exe",
		};
	}
	return undefined;
}
