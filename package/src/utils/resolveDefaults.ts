import {
	defaultOptions,
	type LilypondDefaults,
	type LilypondDefines,
} from "../render.js";

/** Fills in any `defaults` fields left unset with `render.ts`'s own defaults. */
export function resolveDefaults(
	defaults: LilypondDefaults | undefined,
): Required<LilypondDefines> & Pick<LilypondDefaults, "version"> {
	return {
		version: defaults?.version ?? defaultOptions.defaults.version,
		resolution: defaults?.resolution ?? defaultOptions.defaults.resolution,
		crop: defaults?.crop ?? defaultOptions.defaults.crop,
	};
}
