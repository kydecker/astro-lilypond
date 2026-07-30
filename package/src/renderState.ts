import type { LilypondDefaults } from "./render.js";

export interface RenderState {
	binaryPath: string;
	defaults: LilypondDefaults | undefined;
	timeout: number | undefined;
}

/**
 * Keyed on `globalThis`, not module-scope state — some Astro adapters (e.g.
 * `@astrojs/cloudflare`) bundle the page-render step as a separate chunk
 * with its own copy of this module's top-level scope, so a plain module
 * `let` wouldn't survive from `astro:config:setup` into an actual render.
 * `globalThis` is the one thing guaranteed shared across those bundles
 * within the same process — this mirrors `astro-emit-asset`'s own
 * `globalThis`-keyed cache config for exactly the same reason.
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

/**
 * Read by the public `render()` function, which is called from arbitrary
 * user code (component frontmatter) rather than from within the
 * integration's own closures — this is the only way it can reach the
 * resolved `binaryPath`/`defaults`.
 */
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
