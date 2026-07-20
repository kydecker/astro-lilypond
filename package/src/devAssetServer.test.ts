import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { devAssetServerPlugin } from "./devAssetServer.js";

let dir: string;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "astro-lilypond-dev-asset-server-"));
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

function capturedHandler(assetsDir: string, urlBase: string) {
	const plugin = devAssetServerPlugin(assetsDir, urlBase);
	let handler: (req: unknown, res: unknown, next: () => void) => Promise<void>;
	const server = {
		middlewares: {
			use: (fn: typeof handler) => {
				handler = fn;
			},
		},
	};
	(plugin.configureServer as (server: unknown) => void)(server);
	// biome-ignore lint/style/noNonNullAssertion: assigned synchronously above
	return handler!;
}

function fakeResponse() {
	const stream = new PassThrough();
	const chunks: Buffer[] = [];
	stream.on("data", (chunk) => chunks.push(chunk));
	return Object.assign(stream, {
		setHeader: vi.fn(),
		body: () => Buffer.concat(chunks).toString("utf8"),
	});
}

describe("devAssetServerPlugin", () => {
	it("serves an existing svg with the correct content type", async () => {
		await writeFile(join(dir, "abc123.score.svg"), "<svg></svg>");
		const handler = capturedHandler(dir, "/_lilypond");
		const res = fakeResponse();
		const next = vi.fn();

		await handler({ url: "/_lilypond/abc123.score.svg" }, res, next);
		await new Promise((resolve) => res.on("end", resolve));

		expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
		expect(res.body()).toBe("<svg></svg>");
		expect(next).not.toHaveBeenCalled();
	});

	it("serves an existing png with the correct content type", async () => {
		await writeFile(join(dir, "abc123.score.png"), Buffer.from([1, 2, 3]));
		const handler = capturedHandler(dir, "/_lilypond");
		const res = fakeResponse();

		await handler({ url: "/_lilypond/abc123.score.png" }, res, vi.fn());
		await new Promise((resolve) => res.on("end", resolve));

		expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/png");
	});

	it("strips a query string before resolving the filename", async () => {
		await writeFile(join(dir, "abc123.score.svg"), "<svg></svg>");
		const handler = capturedHandler(dir, "/_lilypond");
		const res = fakeResponse();

		await handler({ url: "/_lilypond/abc123.score.svg?t=123" }, res, vi.fn());
		await new Promise((resolve) => res.on("end", resolve));

		expect(res.body()).toBe("<svg></svg>");
	});

	it("calls next() for URLs outside urlBase", async () => {
		const handler = capturedHandler(dir, "/_lilypond");
		const next = vi.fn();

		await handler({ url: "/other/path.svg" }, fakeResponse(), next);

		expect(next).toHaveBeenCalledOnce();
	});

	it("calls next() when the file doesn't exist", async () => {
		const handler = capturedHandler(dir, "/_lilypond");
		const next = vi.fn();

		await handler(
			{ url: "/_lilypond/missing.score.svg" },
			fakeResponse(),
			next,
		);

		expect(next).toHaveBeenCalledOnce();
	});

	it("calls next() for a nested/traversal-shaped path instead of resolving it", async () => {
		const handler = capturedHandler(dir, "/_lilypond");
		const next = vi.fn();

		await handler({ url: "/_lilypond/../../etc/passwd" }, fakeResponse(), next);

		expect(next).toHaveBeenCalledOnce();
	});

	it("calls next() for an unrecognized extension", async () => {
		await writeFile(join(dir, "abc123.score.txt"), "not an asset");
		const handler = capturedHandler(dir, "/_lilypond");
		const next = vi.fn();

		await handler({ url: "/_lilypond/abc123.score.txt" }, fakeResponse(), next);

		expect(next).toHaveBeenCalledOnce();
	});

	it("respects a urlBase with a sub-path (e.g. Astro `base`)", async () => {
		await writeFile(join(dir, "abc123.score.svg"), "<svg></svg>");
		const handler = capturedHandler(dir, "/docs/_lilypond");
		const res = fakeResponse();

		await handler({ url: "/docs/_lilypond/abc123.score.svg" }, res, vi.fn());
		await new Promise((resolve) => res.on("end", resolve));

		expect(res.body()).toBe("<svg></svg>");
	});
});
