import type { AstroIntegrationLogger } from "astro";
import type { LilypondDefaults } from "../render.js";

export interface PluginOptions {
	format?: "svg" | "png";
	defaults?: LilypondDefaults;
	timeout?: number;
	binaryPath?: string;
	isDev?: boolean;
	logger?: Pick<AstroIntegrationLogger, "warn" | "error">;
}
