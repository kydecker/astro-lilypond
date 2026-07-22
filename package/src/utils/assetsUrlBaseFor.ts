import { posix } from "node:path";

/**
 * Joins Astro's `base` config with the configured output directory name
 * into a clean URL prefix — no double or missing slashes, no trailing slash
 * — regardless of whether `base` is `"/"`, `"/docs"`, or `"/docs/"`.
 */
export function assetsUrlBaseFor(base: string, outputDirName: string): string {
	return posix.join(base, outputDirName);
}
