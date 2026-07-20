import { readdir, unlink } from "node:fs/promises";
import { join, relative } from "node:path";
import { isOwnAssetFileName } from "./utils/index.js";

export interface PruneOrphanedAssetsOptions {
	/** Absolute filesystem path to the assets output directory. */
	dir: string;

	/** Filenames (e.g. `"ab12…ef.svg"`) referenced during this build. */
	referenced: ReadonlySet<string>;

	logger?: { info: (message: string) => void };
}

/**
 * Deletes any of our own content-addressed output files under `dir` that
 * weren't referenced during this build, so `publicDir` doesn't accumulate
 * orphaned assets from edited/removed scores forever. Only ever touches
 * files matching our own `<hash>.<title>.(svg|png)` naming — anything else
 * in the directory is left alone.
 */
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

	await Promise.all(orphaned.map((name) => unlink(join(dir, name))));

	if (orphaned.length > 0) {
		const relativeDir = relative(process.cwd(), dir) || ".";
		logger?.info(
			`astro-lilypond: pruned ${orphaned.length} orphaned asset${orphaned.length === 1 ? "" : "s"} from ${relativeDir}`,
		);
	}
}
