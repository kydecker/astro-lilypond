import { defaultOptions, type LilypondDefaults } from "../render.js";

/** Fills in any `defaults` fields left unset with `render.ts`'s own defaults. */
export function resolveDefaults(
	defaults: LilypondDefaults | undefined,
): Required<LilypondDefaults> {
	return {
		version: defaults?.version ?? defaultOptions.defaults.version,
		resolution: defaults?.resolution ?? defaultOptions.defaults.resolution,
		crop: defaults?.crop ?? defaultOptions.defaults.crop,
	};
}
