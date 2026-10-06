import { emitAsset } from "astro-emit-asset/emit";
import type { LilypondPdfResult } from "../index.js";
import type { Backend } from "../render.js";

export interface EmitLilypondPdfAssetOptions {
	title: string;
	source: string;
	backend: Backend;
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

	const { title, source, backend, render } = options;

	const asset = await emitAsset(
		`${title}.[hash].pdf`,
		[source, "pdf", backend],
		async () => {
			const [data] = await render();
			return { data };
		},
	);

	return { src: asset.src };
}
