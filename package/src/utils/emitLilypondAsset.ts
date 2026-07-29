import { emitAsset } from "astro-emit-asset/emit";
import type { LilypondPage } from "../index.js";
import type { Format } from "../render.js";
import { imageDimensionsFor } from "./imageDimensions.js";

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

const EMIT_ASSET_GLOBAL_KEY = "astro-emit-asset";

function assertEmitAssetRegistered(): void {
	if ((globalThis as Record<string, unknown>)[EMIT_ASSET_GLOBAL_KEY]) return;
	throw new Error(
		"astro-lilypond: please add the `lilypond()` integration to your Astro config.",
	);
}

export async function emitLilypondAsset(
	options: EmitLilypondAssetOptions,
): Promise<LilypondPage[]> {
	assertEmitAssetRegistered();

	const { title, format, source, resolution, crop, sizeScale, render } =
		options;

	const result = await emitAsset<PageMeta>(
		`${title}.[hash].${format}`,
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
	);

	const assets = Array.isArray(result) ? result : [result];

	return assets.map((asset) => ({
		src: asset.src,
		width: asset.meta.width,
		height: asset.meta.height,
	}));
}
