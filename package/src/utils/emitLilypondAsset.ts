import { emitAsset } from "astro-emit-asset/emit";
import type { Format } from "../render.js";
import { imageDimensionsFor } from "./imageDimensions.js";
import type { LilypondPage } from "./lilypondPage.js";

export interface EmitLilypondAssetOptions {
	/**
	 * Human-readable title — becomes the emitted file's name, with the hash
	 * `emitAsset()` derives inserted after it (`<title>.<hash>.<format>`).
	 */
	title: string;

	/** Output format — also used as the file extension. */
	format: Format;

	/** The exact LilyPond source rendered, so a change busts the cache. */
	source: string;

	/** Resolution in DPI (PNG only) — a render dependency, so part of the cache key. */
	resolution: number;

	/** Whether output is cropped — a render dependency, so part of the cache key. */
	crop: boolean;

	/**
	 * Multiplies the `width`/`height` reported on each page. The generated
	 * bytes are never touched — this only affects the dimensions handed back
	 * for sizing the `<img>` tag.
	 */
	sizeScale: number;

	/**
	 * Produces the bytes to render, one Buffer per page. Only invoked on a
	 * cache miss.
	 */
	render: () => Promise<Buffer[]>;
}

type PageMeta = {
	width: number | undefined;
	height: number | undefined;
};

type GeneratedPage = { data: Buffer; meta: PageMeta };
type Emitted = { src: string; meta: PageMeta };

// `astro-emit-asset`'s integration stashes its cache on this well-known
// global key (not part of its public API — the package only exports the
// integration itself and `emitAsset()`, not the key it registers under —
// but it's stable across the current 0.1.0 release). Checking it upfront
// lets us fail with an actionable message instead of a bare
// `TypeError: Cannot read properties of undefined (reading 'cache')` from
// deep inside `emitAsset()`.
const EMIT_ASSET_GLOBAL_KEY = "astro-emit-asset";

function assertEmitAssetRegistered(): void {
	if ((globalThis as Record<string, unknown>)[EMIT_ASSET_GLOBAL_KEY]) return;
	throw new Error(
		"astro-lilypond: the `lilypond()` integration must be added to your " +
			"`integrations` array in `astro.config.mjs` — it registers the " +
			"astro-emit-asset pipeline that rendered scores are emitted through. " +
			"This is required even if you're only using `lilypondLoader()` and " +
			"don't otherwise need `lilypond()`'s markdown/`.ly`-import handling.",
	);
}

/**
 * Renders and emits a (possibly multi-page) score via `astro-emit-asset`,
 * reading each page's own dimensions back from its bytes so `<img>` tags can
 * be sized upfront. Caching, dev serving, and pruning unreferenced output are
 * all handled by `astro-emit-asset` itself.
 */
export async function emitLilypondAsset(
	options: EmitLilypondAssetOptions,
): Promise<LilypondPage[]> {
	assertEmitAssetRegistered();

	const { title, format, source, resolution, crop, sizeScale, render } =
		options;

	// `emitAsset()`'s own shipped `emit.d.ts` imports `./types` with no `.js`
	// extension, which is invalid under `moduleResolution: NodeNext` — that
	// unresolvable reference silently collapses `EmittedAsset<T>` (and this
	// call's return type) to `any`, masked only because this project sets
	// `skipLibCheck: true`. Cast back to the shape its (correct, just
	// type-checker-unreachable) declarations promise.
	const result = (await emitAsset<PageMeta>(
		`${title}.[hash].${format}`,
		// `sizeScale` affects the cached `meta.width`/`meta.height`, so it must
		// be part of the cache key — otherwise a `cropScale` config change
		// would keep serving dimensions computed with the old value from a
		// still-valid cache entry (same source/format/resolution/crop) after a
		// rebuild.
		[source, format, resolution, crop, sizeScale],
		async (): Promise<GeneratedPage | GeneratedPage[]> => {
			const buffers = await render();
			const pages = buffers.map((data) => {
				const dimensions = imageDimensionsFor(format, data);
				return {
					data,
					meta: {
						width: dimensions ? dimensions.width * sizeScale : undefined,
						height: dimensions ? dimensions.height * sizeScale : undefined,
					},
				};
			});
			// Returning a 1-element array (instead of the bare object) makes
			// astro-emit-asset insert a page index into the filename even for a
			// single-page score (`title.0.hash.ext`) — return the object
			// directly for that (overwhelmingly common) case so the file is
			// named `title.hash.ext` instead.
			return pages.length === 1 ? pages[0] : pages;
		},
	)) as Emitted | Emitted[];

	const assets = Array.isArray(result) ? result : [result];

	return assets.map((asset) => ({
		src: asset.src,
		width: asset.meta.width,
		height: asset.meta.height,
	}));
}
