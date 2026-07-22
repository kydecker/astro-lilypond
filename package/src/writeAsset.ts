import { randomUUID } from "node:crypto";
import { access, mkdir, readdir, rename, writeFile } from "node:fs/promises";
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

	/** Called with each written/reused file's name, hit or miss. */
	trackAsset?: (fileName: string) => void;

	/**
	 * Produces the bytes to write, one Buffer per page. Only invoked on a
	 * cache miss, so a caller can defer an expensive render behind this and
	 * skip it entirely when the content-addressed file(s) already exist.
	 */
	getBuffers: () => Promise<Buffer[]>;
}

export interface WrittenAsset {
	/** Bare filename under `outputDir`. */
	fileName: string;

	/** Public URL to reference the file by. */
	url: string;
}

/** Page 1 keeps the plain `<hash>.<title>.<format>` name; later pages get `-pN`. */
function pageFileName(
	hash: string,
	title: string,
	format: Format,
	page: number,
): string {
	return page === 1
		? `${hash}.${title}.${format}`
		: `${hash}.${title}-p${page}.${format}`;
}

/**
 * Persists rendered pages to content-addressed files under `outputDir`,
 * skipping the render entirely if page 1 already exists on disk, and returns
 * each page's filename and public URL, in page order.
 */
export async function writeAssets(
	options: WriteAssetOptions,
): Promise<WrittenAsset[]> {
	const { hash, title, format, outputDir, urlBase, trackAsset, getBuffers } =
		options;
	const page1Name = pageFileName(hash, title, format, 1);
	const page1Path = join(outputDir, page1Name);

	const alreadyWritten = await access(page1Path).then(
		() => true,
		() => false,
	);

	let fileNames: string[];

	if (alreadyWritten) {
		// The hash is a deterministic function of the render inputs, so if
		// page 1 was written, every sibling page was too — list the
		// directory once to find out how many there are, rather than
		// probing page 2, 3, ... one at a time. `hash`/`title` are already
		// restricted to `[a-zA-Z0-9_-]+` by `contentHashFor`/`titleFor`, so
		// they're safe to interpolate directly into the pattern.
		const pagePattern = new RegExp(`^${hash}\\.${title}-p(\\d+)\\.${format}$`);
		const entries = await readdir(outputDir);
		const laterPages = entries
			.map((name) => name.match(pagePattern))
			.filter((match): match is RegExpMatchArray => match !== null)
			.sort((a, b) => Number(a[1]) - Number(b[1]))
			.map((match) => match[0]);
		fileNames = [page1Name, ...laterPages];
	} else {
		const buffers = await getBuffers();
		fileNames = buffers.map((_, i) => pageFileName(hash, title, format, i + 1));
		await mkdir(outputDir, { recursive: true });
		await Promise.all(
			buffers.map(async (buf, i) => {
				const destPath = join(outputDir, fileNames[i]);
				// Write to a uniquely-suffixed temp file, then atomically rename
				// onto the final path — safe under concurrent writers racing to
				// produce the same hash, since identical hashes imply identical
				// bytes, so whichever rename lands "wins" without ever leaving a
				// corrupt/partial file.
				const tmpPath = `${destPath}.${randomUUID()}.tmp`;
				await writeFile(tmpPath, buf);
				await rename(tmpPath, destPath);
			}),
		);
	}

	for (const fileName of fileNames) trackAsset?.(fileName);

	return fileNames.map((fileName) => ({
		fileName,
		url: `${urlBase}/${fileName}`,
	}));
}
