import type { AstroIntegrationLogger } from "astro";

type Logger = Pick<AstroIntegrationLogger, "warn" | "error">;

const KEY = "astro-lilypond:logger";
const store = globalThis as unknown as Record<string, Logger | undefined>;

export function setLogger(logger: Logger): void {
	store[KEY] = logger;
}

export function getLogger(): Logger {
	const logger = store[KEY];
	if (!logger) {
		throw new Error(
			"astro-lilypond: please add the `lilypond()` integration to your Astro config.",
		);
	}
	return logger;
}

export function resetLoggerForTests(): void {
	store[KEY] = undefined;
}
