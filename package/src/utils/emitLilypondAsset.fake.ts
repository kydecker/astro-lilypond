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

/**
 * Fake that just awaits `opts.render()` and discards the result — for tests
 * asserting that a `render()` rejection propagates out of the caller.
 */
export function fakeEmitLilypondAssetPropagatingRenderErrors(
	mock: EmitLilypondAssetMock,
): void {
	mock.mockImplementation(async (opts) => {
		await opts.render();
		return [];
	});
}
