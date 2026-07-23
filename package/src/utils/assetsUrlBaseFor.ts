import { posix } from "node:path";

/**
 * Joins Astro's `base` config with the configured output directory name
 * into a clean URL prefix.
 */
export function assetsUrlBaseFor(base: string, outputDirName: string): string {
	return posix.join(base, outputDirName);
}
