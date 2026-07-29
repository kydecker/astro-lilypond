import { emitAsset } from "astro-emit-asset/emit";
import type { LilypondPage } from "../index.js";
import type { Format } from "../render.js";
import { imageDimensionsFor } from "./imageDimensions.js";

export interface EmitLilypondAssetOptions {
	title: string;
	format: Format;
	source: string;
	resolution: number;
	crop: boolean;
	sizeScale: number;
	render: () => Promise<Buffer[]>;
	binaryPath: string | undefined;
}

type PageMeta = {
	width: number | undefined;
	height: number | undefined;
};

type GeneratedPage = { data: Buffer; meta: PageMeta };

export async function emitLilypondAsset(
	options: EmitLilypondAssetOptions,
): Promise<LilypondPage[]> {
	if (!options.binaryPath) {
		throw new Error(
			"astro-lilypond: please add the `lilypond()` integration to your Astro config.",
		);
	}

	const { title, format, source, resolution, crop, sizeScale, render } =
		options;

	const assets = await emitAsset<PageMeta>(
		`${title}.[hash].${format}`,
		[source, format, resolution, crop, sizeScale],
		async (): Promise<GeneratedPage[]> => {
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
	);

	return assets.map((asset) => ({
		src: asset.src,
		width: asset.meta.width,
		height: asset.meta.height,
	}));
}
