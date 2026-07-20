import { FORMATS, type Format } from "../render.js";

const CONTENT_TYPES: Record<Format, string> = {
	svg: "image/svg+xml",
	png: "image/png",
};

const OWN_ASSET_NAME = new RegExp(
	`^[0-9a-f]+\\.[a-zA-Z0-9_-]+\\.(?:${FORMATS.join("|")})$`,
);

/**
 * True for filenames matching our own `<hash>.<title>.<format>` naming —
 * the single source of truth for what counts as one of our own rendered
 * assets, shared by `pruneOrphanedAssets` and the dev asset endpoint.
 */
export function isOwnAssetFileName(name: string): boolean {
	return OWN_ASSET_NAME.test(name);
}

/**
 * The `Content-Type` for one of our own asset filenames, or `undefined` if
 * `fileName` isn't one (see `isOwnAssetFileName`).
 */
export function contentTypeFor(fileName: string): string | undefined {
	if (!isOwnAssetFileName(fileName)) return undefined;
	const format = fileName.slice(fileName.lastIndexOf(".") + 1) as Format;
	return CONTENT_TYPES[format];
}
