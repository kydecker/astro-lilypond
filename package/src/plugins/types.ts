import type { LilypondDefaults } from "../render.js";

export interface PluginOptions {
	format?: "svg" | "png";
	defaults?: LilypondDefaults;
	timeout?: number;
}
