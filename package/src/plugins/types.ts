export interface PluginOptions {
	version?: string;
	format?: "svg" | "png";
	resolution?: number;
	crop?: boolean;
	timeout?: number;
}

/**
 * `PluginOptions` plus the filesystem/URL details resolved once from Astro's
 * config in `astro:config:setup`, threaded into each markdown plugin so it
 * can write rendered assets to disk and reference them by URL. Internal
 * only — not part of the package's public API.
 */
export interface ResolvedPluginOptions extends PluginOptions {
	/** Absolute filesystem path assets are written into. */
	assetsDir: string;

	/** URL prefix assets are referenced by, e.g. `"/_lilypond"`. */
	assetsUrlBase: string;

	/** Records that a given output filename was referenced during this build. */
	trackAsset: (fileName: string) => void;
}
