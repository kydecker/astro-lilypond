import { describe, expect, it, vi } from "vitest";

const { emitAsset } = vi.hoisted(() => ({ emitAsset: vi.fn() }));
vi.mock("astro-emit-asset/emit", () => ({ emitAsset }));

const { emitLilypondPdfAsset } = await import("../emitLilypondPdfAsset.js");

const BASE = {
	title: "score",
	source: "\\relative c' { c d e }",
	binaryPath: "lilypond",
};

/** Runs the real `generateAsset` thunk passed to the mocked `emitAsset`, like `astro-emit-asset` would on a cache miss. */
async function resolveGenerated() {
	const generateAsset = emitAsset.mock.calls.at(-1)?.[2];
	return await generateAsset();
}

describe("emitLilypondPdfAsset", () => {
	it("calls emitAsset with '<title>.[hash].pdf' as the path and [source, 'pdf'] as the cache key", async () => {
		emitAsset.mockResolvedValue({
			src: "/_astro/score.abc123.pdf",
			meta: undefined,
		});

		await emitLilypondPdfAsset({
			...BASE,
			title: "bach-bwv610",
			source: "\\relative c' { c d e }",
			render: vi.fn().mockResolvedValue([Buffer.from("%PDF-1.5 fake")]),
		});

		expect(emitAsset).toHaveBeenCalledWith(
			"bach-bwv610.[hash].pdf",
			["\\relative c' { c d e }", "pdf"],
			expect.any(Function),
		);
	});

	it("returns a bare src string", async () => {
		emitAsset.mockResolvedValue({
			src: "/_astro/score.abc123.pdf",
			meta: undefined,
		});

		const result = await emitLilypondPdfAsset({
			...BASE,
			render: vi.fn().mockResolvedValue([Buffer.from("%PDF-1.5 fake")]),
		});

		expect(result).toEqual({ src: "/_astro/score.abc123.pdf" });
	});

	it("passes generateAsset a single-buffer asset with no meta, from the first render() buffer", async () => {
		emitAsset.mockResolvedValue({
			src: "/_astro/score.abc123.pdf",
			meta: undefined,
		});
		const render = vi
			.fn()
			.mockResolvedValue([Buffer.from("%PDF-1.5 page-1-and-2")]);

		await emitLilypondPdfAsset({ ...BASE, render });

		const generated = await resolveGenerated();
		expect(generated).toEqual({ data: Buffer.from("%PDF-1.5 page-1-and-2") });
	});

	it("throws a clear, actionable error instead of calling emitAsset when binaryPath is unset", async () => {
		emitAsset.mockClear();

		await expect(
			emitLilypondPdfAsset({
				...BASE,
				binaryPath: undefined,
				render: vi.fn(),
			}),
		).rejects.toThrow(/lilypond\(\).*Astro config/s);
		expect(emitAsset).not.toHaveBeenCalled();
	});
});
