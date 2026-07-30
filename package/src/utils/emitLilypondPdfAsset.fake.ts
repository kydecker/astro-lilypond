import type { vi } from "vitest";
import type { emitLilypondPdfAsset } from "./emitLilypondPdfAsset.js";

type EmitLilypondPdfAssetMock = ReturnType<
	typeof vi.mocked<typeof emitLilypondPdfAsset>
>;

export function fakeEmitLilypondPdfAsset(
	mock: EmitLilypondPdfAssetMock,
	urlBase = "/_astro",
): void {
	mock.mockImplementation(async (opts) => {
		await opts.render();
		return { src: `${urlBase}/${opts.title}.pdf` };
	});
}
