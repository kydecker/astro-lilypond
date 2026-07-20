import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { APIRoute } from "astro";
import { DEV_ASSETS_DIR_ENV } from "./devAssetsEnvVar.js";
import { contentTypeFor } from "./utils/index.js";

/**
 * Injected as an Astro route (see `index.ts`) to serve rendered assets from
 * the untracked dev cache directory during `astro dev` — Astro's own
 * routing resolves `base` and traversal-safety for us, so this doesn't need
 * to reimplement either (unlike a hand-rolled Vite dev-server middleware
 * would). `assetsDir` is threaded in via an env var set once in
 * `astro:config:setup`, since this module is loaded through Vite's SSR
 * module graph — a separate module instance from the integration's own —
 * so it can't share in-memory state with `index.ts` directly.
 */
export const GET: APIRoute = async ({ params }) => {
	const fileName = params.fileName;
	const contentType = fileName ? contentTypeFor(fileName) : undefined;
	const assetsDir = process.env[DEV_ASSETS_DIR_ENV];
	if (!fileName || !contentType || !assetsDir) {
		return new Response(null, { status: 404 });
	}

	try {
		const buffer = await readFile(join(assetsDir, fileName));
		return new Response(buffer, { headers: { "Content-Type": contentType } });
	} catch {
		return new Response(null, { status: 404 });
	}
};
