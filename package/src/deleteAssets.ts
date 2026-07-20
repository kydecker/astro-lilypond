import { readdir, unlink } from "node:fs/promises";
import { join, relative } from "node:path";
import { isOwnAssetFileName } from "./utils/index.js";

interface DeleteAssetsOptions {
	/** Absolute filesystem path the files live in. */
	dir: string;

	/** Filenames under `dir` to delete. */
	fileNames: readonly string[];

	/** Adjective describing why these were deleted. */
	reason: "orphaned" | "stale";

	/** Where the deletion is reported as coming "from" in the log message. */
	context: string;

	logger?: { info: (message: string) => void };
}

/** Deletes `fileNames` from `dir` and logs a one-line summary. Ignores files that are already gone. */
async function deleteAssets(options: DeleteAssetsOptions): Promise<void> {
	const { dir, fileNames, reason, context, logger } = options;
	if (fileNames.length === 0) return;

	await Promise.all(
		fileNames.map((name) => unlink(join(dir, name)).catch(() => {})),
	);

	logger?.info(
		`astro-lilypond: pruned ${fileNames.length} ${reason} asset${fileNames.length === 1 ? "" : "s"} from ${context}`,
	);
}

/** Relativizes `path` to the current working directory for log messages. */
function relativeToCwd(path: string): string {
	return relative(process.cwd(), path) || ".";
}

export interface PruneOrphanedAssetsOptions {
	/** Absolute filesystem path to the assets output directory. */
	dir: string;

	/** Filenames (e.g. `"ab12…ef.svg"`) referenced during this build. */
	referenced: ReadonlySet<string>;

	logger?: { info: (message: string) => void };
}

/** Deletes our content-addressed files under `dir` that weren't referenced this build. */
export async function pruneOrphanedAssets(
	options: PruneOrphanedAssetsOptions,
): Promise<void> {
	const { dir, referenced, logger } = options;

	let entries: string[];
	try {
		entries = await readdir(dir);
	} catch {
		return;
	}

	const orphaned = entries.filter(
		(name) => isOwnAssetFileName(name) && !referenced.has(name),
	);

	await deleteAssets({
		dir,
		fileNames: orphaned,
		reason: "orphaned",
		context: relativeToCwd(dir),
		logger,
	});
}

export interface PruneStaleAssetsOptions {
	/** Per-source history of output filenames, keyed by module id or file path. */
	assetsBySource: Map<string, Set<string>>;

	/** Stable identifier for the source these `fileNames` were rendered from. */
	sourceKey: string;

	/** Every output filename this source's current transform pass produced. */
	fileNames: readonly string[];

	/** Absolute filesystem path the files live in. */
	outputDir: string;

	logger?: { info: (message: string) => void };
}

/** Deletes a source's own previously-rendered files that it no longer produces. */
export async function pruneStaleAssets(
	options: PruneStaleAssetsOptions,
): Promise<void> {
	const { assetsBySource, sourceKey, fileNames, outputDir, logger } = options;

	const next = new Set(fileNames);
	const previous = assetsBySource.get(sourceKey);
	assetsBySource.set(sourceKey, next);

	if (!previous) return;

	const stale = [...previous].filter((name) => !next.has(name));

	await deleteAssets({
		dir: outputDir,
		fileNames: stale,
		reason: "stale",
		context: relativeToCwd(sourceKey),
		logger,
	});
}
