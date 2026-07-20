/**
 * Joins Astro's `base` config with the configured output directory name
 * into a clean URL prefix — no double or missing slashes, no trailing slash
 * — regardless of whether `base` is `"/"`, `"/docs"`, or `"/docs/"`.
 */
export function assetsUrlBaseFor(base: string, outputDirName: string): string {
	const trimmedBase = base.replace(/\/+$/, "");
	const trimmedDir = outputDirName.replace(/^\/+|\/+$/g, "");
	return `${trimmedBase}/${trimmedDir}`;
}
