import type { Plugin } from "vite";
import type { LilypondDefaults } from "./render.js";

export const VIRTUAL_STATE_MODULE_ID = "virtual:astro-lilypond/state";
const RESOLVED_VIRTUAL_STATE_MODULE_ID = `\0${VIRTUAL_STATE_MODULE_ID}`;

export interface LilypondState {
	binaryPath: string;
	defaults: LilypondDefaults | undefined;
	timeout: number | undefined;
	isDev: boolean;
}

/**
 * Publishes `state` (resolved once in `astro:config:setup`) as
 * `virtual:astro-lilypond/state`
 */
export function lilypondStatePlugin(state: LilypondState): Plugin {
	return {
		name: "astro-lilypond-state",
		resolveId(id) {
			if (id === VIRTUAL_STATE_MODULE_ID)
				return RESOLVED_VIRTUAL_STATE_MODULE_ID;
		},
		load(id) {
			if (id === RESOLVED_VIRTUAL_STATE_MODULE_ID) {
				return `export default ${JSON.stringify(state)};`;
			}
		},
	};
}

/**
 * Read by the public `render()` and `lilypondLoader()`,
 * called from user code rather than the integration's own closures.
 */
export async function getLilypondState(): Promise<LilypondState> {
	try {
		const mod = await import(VIRTUAL_STATE_MODULE_ID);
		return (mod as { default: LilypondState }).default;
	} catch {
		throw new Error(
			"astro-lilypond: please add the `lilypond()` integration to your Astro config.",
		);
	}
}
