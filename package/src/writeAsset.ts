import { randomUUID } from "node:crypto";
import { access, mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Format } from "./render.js";

export interface WriteAssetOptions {
	/** Content hash — the first segment of the filename. */
	hash: string;

	/**
	 * Human-readable title — the middle segment of the filename, e.g. the
	 * source file's basename. See `titleFor()`.
	 */
	title: string;

	/** Output format — also used as the file extension. */
	format: Format;

	/** Absolute filesystem path to write the file into. */
	outputDir: string;

	/** URL prefix the returned URL is built from, e.g. `"/_lilypond"`. */
	urlBase: string;

	/** Called with the written/reused file's name, hit or miss. */
	trackAsset?: (fileName: string) => void;

	/**
	 * Produces the bytes to write. Only invoked on a cache miss, so a caller
	 * can defer an expensive render behind this and skip it entirely when the
	 * content-addressed file already exists on disk.
	 */
	getBuffer: () => Promise<Buffer>;
}

/**
 * Persists rendered bytes to a content-addressed file under `outputDir`,
 * skipping the render entirely if that file already exists, and returns the
 * public URL to reference it by.
 */
export async function writeAsset(options: WriteAssetOptions): Promise<string> {
	const { hash, title, format, outputDir, urlBase, trackAsset, getBuffer } =
		options;
	const fileName = `${hash}.${title}.${format}`;
	const destPath = join(outputDir, fileName);
	const url = `${urlBase}/${fileName}`;

	const alreadyWritten = await access(destPath).then(
		() => true,
		() => false,
	);

	if (!alreadyWritten) {
		const buf = await getBuffer();
		await mkdir(outputDir, { recursive: true });
		// Write to a uniquely-suffixed temp file, then atomically rename onto
		// the final path — safe under concurrent writers racing to produce the
		// same hash, since identical hashes imply identical bytes, so whichever
		// rename lands "wins" without ever leaving a corrupt/partial file.
		const tmpPath = `${destPath}.${randomUUID()}.tmp`;
		await writeFile(tmpPath, buf);
		await rename(tmpPath, destPath);
	}

	trackAsset?.(fileName);
	return url;
}
