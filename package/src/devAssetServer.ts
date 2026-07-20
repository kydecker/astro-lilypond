import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { Plugin } from "vite";

const CONTENT_TYPES: Record<string, string> = {
	".svg": "image/svg+xml",
	".png": "image/png",
};

/**
 * Serves rendered assets from `assetsDir` under `urlBase` during `astro dev`,
 * standing in for the static file server Astro normally provides for
 * `publicDir` — since in dev, assets are written to an untracked cache
 * directory instead (see `index.ts`), not `publicDir` itself.
 */
export function devAssetServerPlugin(
	assetsDir: string,
	urlBase: string,
): Plugin {
	return {
		name: "vite-plugin-astro-lilypond-dev-assets",
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				if (!req.url) return next();
				const pathname = req.url.split("?")[0] ?? "";
				if (!pathname.startsWith(`${urlBase}/`)) return next();

				// Asset filenames are always a single flat segment
				// (`<hash>.<title>.<ext>`) — reject anything else, including
				// traversal attempts.
				const fileName = pathname.slice(urlBase.length + 1);
				if (!fileName || fileName.includes("/")) return next();

				const contentType =
					CONTENT_TYPES[fileName.slice(fileName.lastIndexOf("."))];
				if (!contentType) return next();

				const filePath = join(assetsDir, fileName);
				try {
					await stat(filePath);
				} catch {
					return next();
				}

				res.setHeader("Content-Type", contentType);
				createReadStream(filePath).pipe(res);
			});
		},
	};
}
