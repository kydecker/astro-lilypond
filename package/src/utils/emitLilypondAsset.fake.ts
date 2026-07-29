import type { vi } from "vitest";
import type { emitLilypondAsset } from "./emitLilypondAsset.js";

type EmitLilypondAssetMock = ReturnType<
	typeof vi.mocked<typeof emitLilypondAsset>
>;

export function fakeEmitLilypondAsset(
	mock: EmitLilypondAssetMock,
	urlBase = "/_astro",
): void {
	mock.mockImplementation(async (opts) => {
		const buffers = await opts.render();
		return buffers.map((_, i) => ({
			src: `${urlBase}/${opts.title}${i === 0 ? "" : `-p${i + 1}`}.${opts.format}`,
		}));
	});
}

export function fakeEmitLilypondAssetPropagatingRenderErrors(
	mock: EmitLilypondAssetMock,
): void {
	mock.mockImplementation(async (opts) => {
		await opts.render();
		return [];
	});
}
