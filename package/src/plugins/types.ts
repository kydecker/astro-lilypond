export interface PluginOptions {
	version?: string;
	format?: "svg" | "png";
	resolution?: number;
	crop?: boolean;
	timeout?: number;
}

/**
 * `PluginOptions` plus the filesystem/URL details resolved once from Astro's
 * config in `astro:config:setup`. Internal only.
 */
export interface ResolvedPluginOptions extends PluginOptions {
	/** Absolute filesystem path assets are written into. */
	assetsDir: string;

	/** URL prefix assets are referenced by, e.g. `"/_lilypond"`. */
	assetsUrlBase: string;

	/** Records that a given output filename was referenced during this build. */
	trackAsset: (fileName: string) => void;

	/** Deletes files this source previously produced but no longer does. */
	pruneStaleAssets: (
		sourceKey: string,
		fileNames: readonly string[],
	) => Promise<void>;
}
