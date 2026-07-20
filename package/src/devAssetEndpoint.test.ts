import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "./devAssetEndpoint.js";
import { DEV_ASSETS_DIR_ENV } from "./devAssetsEnvVar.js";

let dir: string;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "astro-lilypond-dev-endpoint-"));
	process.env[DEV_ASSETS_DIR_ENV] = dir;
});

afterEach(async () => {
	delete process.env[DEV_ASSETS_DIR_ENV];
	await rm(dir, { recursive: true, force: true });
});

function contextWith(fileName: string | undefined) {
	return { params: { fileName } } as unknown as Parameters<typeof GET>[0];
}

describe("devAssetEndpoint GET", () => {
	it("serves an existing svg with the correct content type", async () => {
		await writeFile(join(dir, "abc123.score.svg"), "<svg></svg>");

		const response = await GET(contextWith("abc123.score.svg"));

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
		expect(await response.text()).toBe("<svg></svg>");
	});

	it("serves an existing png with the correct content type", async () => {
		await writeFile(join(dir, "abc123.score.png"), Buffer.from([1, 2, 3]));

		const response = await GET(contextWith("abc123.score.png"));

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("image/png");
	});

	it("404s when fileName is missing", async () => {
		const response = await GET(contextWith(undefined));
		expect(response.status).toBe(404);
	});

	it("404s for a name that isn't one of our own assets, without touching disk", async () => {
		const response = await GET(contextWith("../../etc/passwd"));
		expect(response.status).toBe(404);
	});

	it("404s for a well-formed name whose file doesn't exist", async () => {
		const response = await GET(contextWith("missing.score.svg"));
		expect(response.status).toBe(404);
	});

	it("404s when the dev assets dir env var isn't set", async () => {
		await writeFile(join(dir, "abc123.score.svg"), "<svg></svg>");
		delete process.env[DEV_ASSETS_DIR_ENV];

		const response = await GET(contextWith("abc123.score.svg"));

		expect(response.status).toBe(404);
	});
});
