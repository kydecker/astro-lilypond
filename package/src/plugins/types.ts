import type { AstroIntegrationLogger } from "astro";
import type { LilypondDefaults } from "../render.js";

export interface PluginOptions {
	defaults?: LilypondDefaults;
	timeout?: number;
	binaryPath?: string;
	isDev?: boolean;
	logger?: Pick<AstroIntegrationLogger, "warn" | "error">;
	includePaths?: string[];
}
