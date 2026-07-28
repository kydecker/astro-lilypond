import { emitAsset } from "astro-emit-asset/emit";
import type { Format } from "../render.js";
import { imageDimensionsFor } from "./imageDimensions.js";

export interface EmitLilypondAssetOptions {
	/** Human-readable title — the file name `emitAsset()` derives a hash off of. */
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

export interface EmittedLilypondPage {
	src: string;
	width?: number;
	height?: number;
}

type PageMeta = {
	width: number | undefined;
	height: number | undefined;
};

/**
 * Renders and emits a (possibly multi-page) score via `astro-emit-asset`,
 * reading each page's own dimensions back from its bytes so `<img>` tags can
 * be sized upfront. Caching, dev serving, and pruning unreferenced output are
 * all handled by `astro-emit-asset` itself.
 */
export async function emitLilypondAsset(
	options: EmitLilypondAssetOptions,
): Promise<EmittedLilypondPage[]> {
	const { title, format, source, resolution, crop, sizeScale, render } =
		options;

	// `emitAsset()`'s array-returning overload doesn't get selected by TS here
	// (a limitation of overload resolution with a generic + contextually-typed
	// async callback), so the call comes back as `any` — cast it back to the
	// shape its own types promise for an array-returning generator.
	const assets = (await emitAsset<PageMeta>(
		`${title}.${format}`,
		[source, format, resolution, crop],
		async () => {
			const buffers = await render();
			return buffers.map((data) => {
				const dimensions = imageDimensionsFor(format, data);
				return {
					data,
					meta: {
						width: dimensions ? dimensions.width * sizeScale : undefined,
						height: dimensions ? dimensions.height * sizeScale : undefined,
					},
				};
			});
		},
	)) as { src: string; meta: PageMeta }[];

	return assets.map((asset) => ({
		src: asset.src,
		width: asset.meta.width,
		height: asset.meta.height,
	}));
}
