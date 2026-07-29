import type { LilypondVersion } from "../types/lilypondVersion.js";

export interface AutoInstallOptions {
	/**
	 * LilyPond version to download when none is found on `PATH`. Independent
	 * of `defaults.version`, which scores are compiled against.
	 * @default "2.26.0"
	 */
	version?: LilypondVersion;
}

export function resolveAutoInstallOption(
	autoInstall: boolean | AutoInstallOptions | undefined,
): { version?: LilypondVersion; autoInstall: boolean } {
	return {
		version: typeof autoInstall === "object" ? autoInstall.version : undefined,
		autoInstall: autoInstall !== false,
	};
}
