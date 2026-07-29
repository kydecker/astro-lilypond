import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
	access,
	mkdir,
	mkdtemp,
	readdir,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { LilypondVersion } from "../types/lilypondVersion.js";
import { lilypondCacheDir } from "./cacheDir.js";
import { resolvePlatformTarget } from "./platformTarget.js";

const execFileAsync = promisify(execFile);

/**
 * GitLab's generic package registry, which LilyPond publishes release
 * archives to. Predictable and stable across versions — no release-API
 * lookup needed — and responses carry an `x-checksum-sha256` header we use
 * to verify the download.
 */
function downloadUrlFor(
	version: LilypondVersion,
	platform: string,
	arch: string,
	archiveExt: string,
): string {
	const filename = `lilypond-${version}-${platform}-${arch}.${archiveExt}`;
	return `https://gitlab.com/api/v4/projects/lilypond%2Flilypond/packages/generic/lilypond/${version}/${filename}`;
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

export interface DownloadLilypondOptions {
	version: LilypondVersion;
	cacheDir?: string;
	fetchImpl?: typeof fetch;
	log?: (message: string) => void;
}

/**
 * Downloads, verifies, and extracts a prebuilt LilyPond release into the
 * cache dir, then returns the path to its `bin/lilypond[.exe]`. Returns
 * `undefined` when LilyPond publishes no prebuilt for the current
 * platform/arch. A previously-completed install for the same version is
 * reused as-is.
 */
export async function downloadLilypond({
	version,
	cacheDir = lilypondCacheDir(),
	fetchImpl = fetch,
	log = () => {},
}: DownloadLilypondOptions): Promise<string | undefined> {
	const target = resolvePlatformTarget();
	if (!target) return undefined;

	const { platform, arch, archiveExt, binaryName } = target;
	const installDir = join(cacheDir, `lilypond-${version}-${platform}-${arch}`);
	const markerPath = join(installDir, ".complete");
	const binaryPath = join(installDir, "bin", binaryName);

	if (await pathExists(markerPath)) return binaryPath;

	const url = downloadUrlFor(version, platform, arch, archiveExt);
	log(`astro-lilypond: downloading LilyPond ${version} (${platform}-${arch})…`);

	const response = await fetchImpl(url);
	if (!response.ok || !response.body) {
		throw new Error(
			`failed to download LilyPond ${version} from ${url} (HTTP ${response.status})`,
		);
	}
	const expectedSha256 = response.headers.get("x-checksum-sha256");

	await mkdir(cacheDir, { recursive: true });
	const workDir = await mkdtemp(join(cacheDir, ".tmp-"));

	try {
		const archivePath = join(workDir, `archive.${archiveExt}`);
		const hash = createHash("sha256");
		const chunks: Buffer[] = [];
		for await (const chunk of response.body as AsyncIterable<Uint8Array>) {
			const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			hash.update(buf);
			chunks.push(buf);
		}
		const data = Buffer.concat(chunks);

		if (expectedSha256) {
			const actualSha256 = hash.digest("hex");
			if (actualSha256 !== expectedSha256) {
				throw new Error(
					`checksum mismatch downloading LilyPond ${version} from ${url}\n` +
						`  expected ${expectedSha256}\n  got      ${actualSha256}`,
				);
			}
		} else {
			log(
				"astro-lilypond: download response had no checksum header — skipping integrity verification",
			);
		}

		await writeFile(archivePath, data);

		const extractDir = join(workDir, "extract");
		await mkdir(extractDir, { recursive: true });
		await execFileAsync("tar", ["-xf", archivePath, "-C", extractDir]);

		// The archive contains a single top-level `lilypond-<version>/` dir.
		const [extractedRoot] = await readdir(extractDir);
		if (!extractedRoot) {
			throw new Error(`downloaded archive for LilyPond ${version} was empty`);
		}

		await rm(installDir, { recursive: true, force: true });
		await rename(join(extractDir, extractedRoot), installDir);
		await writeFile(markerPath, "");

		log(`astro-lilypond: installed LilyPond ${version} to ${installDir}`);
		return binaryPath;
	} finally {
		await rm(workDir, { recursive: true, force: true });
	}
}
