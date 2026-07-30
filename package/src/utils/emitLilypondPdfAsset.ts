import { emitAsset } from "astro-emit-asset/emit";
import type { LilypondPdfResult } from "../index.js";

export interface EmitLilypondPdfAssetOptions {
	title: string;
	source: string;
	binaryPath: string | undefined;
	render: () => Promise<Buffer[]>;
}

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
