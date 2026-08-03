import {
	type AutoInstallOptions,
	resolveAutoInstallOption,
	resolveLilypondBinary,
} from "./binary/index.js";
import type { LilypondDefaults } from "./render.js";

export interface RenderState {
	binaryPath: string;
	defaults: LilypondDefaults | undefined;
	timeout: number | undefined;
	isDev: boolean;
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

export interface ResolveAndSetRenderStateOptions {
	autoInstall?: boolean | AutoInstallOptions;
	defaults?: LilypondDefaults;
	timeout?: number;
	isDev: boolean;
	logger: { info: (message: string) => void; warn: (message: string) => void };
}

/**
 * Shared by the `lilypond()` integration's `astro:config:setup` hook and
 * `lilypondLoader()`'s `load()`: resolves the `lilypond` binary and
 * populates the render state from it. Returns the resolved binary path for
 * callers (e.g. Markdown plugins) that also need it directly.
 */
export async function resolveAndSetRenderState(
	options: ResolveAndSetRenderStateOptions,
): Promise<string> {
	const binaryPath = await resolveLilypondBinary({
		...resolveAutoInstallOption(options.autoInstall),
		log: (message) => options.logger.info(message),
		warn: (message) => options.logger.warn(message),
	});
	setRenderState({
		binaryPath,
		defaults: options.defaults,
		timeout: options.timeout,
		isDev: options.isDev,
	});
	return binaryPath;
}
