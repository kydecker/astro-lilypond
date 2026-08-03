import type { AstroIntegrationLogger } from "astro";
import type { LilypondDefaults } from "./render.js";

export interface LilypondState {
	binaryPath: string;
	defaults: LilypondDefaults | undefined;
	timeout: number | undefined;
	isDev: boolean;
	logger: Pick<AstroIntegrationLogger, "warn" | "error">;
}

/**
 * Keyed on `globalThis` rather than module-scope state — some Astro adapters
 * bundle the render step as a separate chunk with its own copy of this
 * module, so a plain module `let` wouldn't survive from
 * `astro:config:setup` into an actual render.
 */
const KEY = "astro-lilypond:state";
const store = globalThis as unknown as Record<
	string,
	LilypondState | undefined
>;

export function setLilypondState(state: LilypondState): void {
	store[KEY] = state;
}

export function getLilypondState(): LilypondState {
	const state = store[KEY];
	if (!state) {
		throw new Error(
			"astro-lilypond: please add the `lilypond()` integration to your Astro config.",
		);
	}
	return state;
}

export function resetLilypondStateForTests(): void {
	store[KEY] = undefined;
}
