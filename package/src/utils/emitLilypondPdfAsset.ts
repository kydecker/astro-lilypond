import { emitAsset } from "astro-emit-asset/emit";
import type { LilypondPdfResult } from "../index.js";

export interface EmitLilypondPdfAssetOptions {
	title: string;
	source: string;
	binaryPath: string | undefined;
	render: () => Promise<Buffer[]>;
}

/**
 * Emits a single downloadable PDF asset for a score. Unlike
 * `emitLilypondAsset()`, a PDF isn't embedded as an `<img>`, so there's no
 * width/height meta to compute — just a `src` URL.
 *
 * A `.ly` file containing multiple `\book`s (rare) would render to more than
 * one PDF file; only the first is surfaced here.
 */
export async function emitLilypondPdfAsset(
	options: EmitLilypondPdfAssetOptions,
): Promise<LilypondPdfResult> {
	if (!options.binaryPath) {
		throw new Error(
			"astro-lilypond: please add the `lilypond()` integration to your Astro config.",
		);
	}

	const { title, source, render } = options;

	const asset = await emitAsset(
		`${title}.[hash].pdf`,
		[source, "pdf"],
		async () => {
			const [data] = await render();
			return { data };
		},
	);

	return { src: asset.src };
}
