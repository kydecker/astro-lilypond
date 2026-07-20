import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { APIRoute } from "astro";
import { DEV_ASSETS_DIR_ENV } from "./devAssetsEnvVar.js";
import { contentTypeFor } from "./utils/index.js";

/**
 * Serve rendered assets from the untracked dev cache directory
 * during `astro dev`.
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
