import type { LilypondDefaults } from "../render.js";

export interface PluginOptions {
	format?: "svg" | "png";
	defaults?: LilypondDefaults;
	timeout?: number;
	/**
	 * Path to the `lilypond` binary to invoke. Set by the integration's
	 * `astro:config:setup` hook once it resolves (or downloads) one — not
	 * meant to be set directly.
	 */
	binaryPath?: string;
}
