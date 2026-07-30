import type { LilypondDefaults } from "./render.js";

export interface RenderState {
	binaryPath: string;
	defaults: LilypondDefaults | undefined;
	timeout: number | undefined;
}

/**
 * Keyed on `globalThis` rather than module-scope state — some Astro adapters
 * bundle the render step as a separate chunk with its own copy of this
 * module, so a plain module `let` wouldn't survive from
 * `astro:config:setup` into an actual render.
 */
const GLOBAL_KEY = "astro-lilypond:renderState";

interface GlobalWithRenderState {
	[GLOBAL_KEY]?: RenderState;
}

function globalStore(): GlobalWithRenderState {
	return globalThis as GlobalWithRenderState;
}

/** Called by the `lilypond()` integration's `astro:config:setup` hook. */
export function setRenderState(next: RenderState): void {
	globalStore()[GLOBAL_KEY] = next;
}

/** Read by the public `render()`, called from user code rather than the integration's own closures. */
export function getRenderState(): RenderState {
	const state = globalStore()[GLOBAL_KEY];
	if (!state) {
		throw new Error(
			"astro-lilypond: please add the `lilypond()` integration to your Astro config.",
		);
	}
	return state;
}

/** Test-only: resets the shared singleton between test cases. */
export function resetRenderStateForTests(): void {
	globalStore()[GLOBAL_KEY] = undefined;
}
