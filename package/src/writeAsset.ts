import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Format } from "./render.js";
import { imageDimensionsFor } from "./utils/imageDimensions.js";

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

	/**
	 * Multiplies the `width`/`height` reported on each `WrittenAsset`. The
	 * written file's own bytes are never touched — this only affects the
	 * dimensions handed back for sizing the `<img>` tag, so it's cheap to
	 * change and applies even to a cache hit that skips `getBuffers`.
	 * @default 1
	 */
	sizeScale?: number;
}

export interface WrittenAsset {
	/** Bare filename under `outputDir`. */
	fileName: string;

	/** Public URL to reference the file by. */
	url: string;

	/**
	 * Dimensions read back from the written file's own bytes, so `<img>`
	 * tags can be sized upfront and avoid layout shift on load. Omitted if
	 * they couldn't be determined (e.g. unrecognized/malformed content).
	 */
	width?: number;
	height?: number;
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

async function exists(path: string): Promise<boolean> {
	return access(path).then(
		() => true,
		() => false,
	);
}

/**
 * Finds every already-written sibling page after page 1, stopping at the
 * first missing page number — pages are written contiguously, so a gap
 * means the end. Costs one `access()` per actual page (typically 0-2)
 * rather than listing the whole (potentially large, shared) `outputDir`.
 */
async function existingSiblingPages(
	outputDir: string,
	hash: string,
	title: string,
	format: Format,
): Promise<string[]> {
	const siblings: string[] = [];
	for (let page = 2; ; page++) {
		const fileName = pageFileName(hash, title, format, page);
		if (!(await exists(join(outputDir, fileName)))) break;
		siblings.push(fileName);
	}
	return siblings;
}

/**
 * Persists rendered pages to content-addressed files under `outputDir`,
 * skipping the render entirely if page 1 already exists on disk, and returns
 * each page's filename and public URL, in page order.
 */
export async function writeAssets(
	options: WriteAssetOptions,
): Promise<WrittenAsset[]> {
	const {
		hash,
		title,
		format,
		outputDir,
		urlBase,
		trackAsset,
		getBuffers,
		sizeScale = 1,
	} = options;
	const page1Name = pageFileName(hash, title, format, 1);
	const page1Path = join(outputDir, page1Name);

	const alreadyWritten = await exists(page1Path);

	let fileNames: string[];
	// Populated on a cache miss, so dimensions can be read from the buffers
	// already in hand instead of reading each file back from disk.
	let buffersByFileName: Map<string, Buffer> | undefined;

	if (alreadyWritten) {
		fileNames = [
			page1Name,
			...(await existingSiblingPages(outputDir, hash, title, format)),
		];
	} else {
		const buffers = await getBuffers();
		fileNames = buffers.map((_, i) => pageFileName(hash, title, format, i + 1));
		buffersByFileName = new Map(fileNames.map((name, i) => [name, buffers[i]]));
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

	return Promise.all(
		fileNames.map(async (fileName) => {
			const buf =
				buffersByFileName?.get(fileName) ??
				(await readFile(join(outputDir, fileName)));
			const dimensions = imageDimensionsFor(format, buf);
			return {
				fileName,
				url: `${urlBase}/${fileName}`,
				width: dimensions ? dimensions.width * sizeScale : undefined,
				height: dimensions ? dimensions.height * sizeScale : undefined,
			};
		}),
	);
}
