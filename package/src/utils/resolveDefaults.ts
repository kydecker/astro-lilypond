import { defaultOptions, type LilypondDefaults } from "../render.js";

/** Fills in any `defaults` fields left unset with `render.ts`'s own defaults. */
export function resolveDefaults(
	defaults: LilypondDefaults | undefined,
): Required<LilypondDefaults> {
	const { version, resolution, crop } = defaultOptions.defaults;

	return {
		version: defaults?.version ?? version,
		resolution: defaults?.resolution ?? resolution,
		crop: defaults?.crop ?? crop,
	};
}
