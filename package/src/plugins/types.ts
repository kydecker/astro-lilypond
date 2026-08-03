import type { LilypondDefaults } from "../render.js";

export interface PluginOptions {
	format?: "svg" | "png";
	defaults?: LilypondDefaults;
	timeout?: number;
	binaryPath?: string;
	/**
	 * `command === "dev"` from `astro:config:setup`. When true, a block that
	 * fails to render is shown as an inline error instead of throwing.
	 */
	isDev?: boolean;
}
