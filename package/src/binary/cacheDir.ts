import { homedir } from "node:os";
import { join } from "node:path";

export function lilypondCacheDir(
	env: NodeJS.ProcessEnv = process.env,
	platform: NodeJS.Platform = process.platform,
): string {
	if (env.ASTRO_LILYPOND_CACHE_DIR) return env.ASTRO_LILYPOND_CACHE_DIR;

	if (platform === "darwin") {
		return join(homedir(), "Library", "Caches", "astro-lilypond");
	}
	if (platform === "win32") {
		const base = env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
		return join(base, "astro-lilypond", "Cache");
	}
	const base = env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
	return join(base, "astro-lilypond");
}
