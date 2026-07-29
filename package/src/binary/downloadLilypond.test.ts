import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("child_process", () => ({
	execFile: vi.fn(
		(
			_bin: string,
			_args: string[],
			cb: (err: unknown, res?: { stdout: string; stderr: string }) => void,
		) => {
			cb(null, { stdout: "", stderr: "" });
		},
	),
}));

vi.mock("fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("fs/promises")>();
	return {
		...actual,
		access: vi.fn(async () => {
			throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
		}),
		mkdir: vi.fn(async () => undefined),
		mkdtemp: vi.fn(async (prefix: string) => `${prefix}XXXXXX`),
		writeFile: vi.fn(async () => {}),
		readdir: vi.fn(async () => ["lilypond-2.26.0-linux-x86_64"]),
		rename: vi.fn(async () => {}),
		rm: vi.fn(async () => {}),
	};
});

vi.mock("./platformTarget.js", () => ({
	resolvePlatformTarget: vi.fn(),
}));

import { execFile } from "node:child_process";
import { access, readdir, rename, writeFile } from "node:fs/promises";
import { downloadLilypond } from "./downloadLilypond.js";
import { resolvePlatformTarget } from "./platformTarget.js";

const mockExecFile = vi.mocked(execFile);
const mockAccess = vi.mocked(access);
const mockReaddir = vi.mocked(readdir) as unknown as ReturnType<typeof vi.fn>;
const mockRename = vi.mocked(rename);
const mockWriteFile = vi.mocked(writeFile);
const mockResolvePlatformTarget = vi.mocked(resolvePlatformTarget);

const ARCHIVE_BYTES = Buffer.from("fake archive contents");
const ARCHIVE_SHA256 = createHash("sha256").update(ARCHIVE_BYTES).digest("hex");

function fakeResponse(overrides: {
	ok?: boolean;
	status?: number;
	checksum?: string | null;
	body?: Uint8Array[] | null;
}) {
	const {
		ok = true,
		status = 200,
		checksum = ARCHIVE_SHA256,
		body = [ARCHIVE_BYTES],
	} = overrides;
	return {
		ok,
		status,
		headers: {
			get: (name: string) => (name === "x-checksum-sha256" ? checksum : null),
		},
		body: body
			? {
					[Symbol.asyncIterator]: async function* () {
						for (const chunk of body) yield chunk;
					},
				}
			: null,
	} as unknown as Response;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockResolvePlatformTarget.mockReturnValue({
		platform: "linux",
		arch: "x86_64",
		archiveExt: "tar.gz",
		binaryName: "lilypond",
	});
	mockAccess.mockImplementation(async () => {
		throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
	});
	mockReaddir.mockResolvedValue(["lilypond-2.26.0-linux-x86_64"]);
	mockExecFile.mockImplementation(((
		_bin: string,
		_args: string[],
		cb: (err: unknown, res?: { stdout: string; stderr: string }) => void,
	) => {
		cb(null, { stdout: "", stderr: "" });
	}) as unknown as typeof execFile);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("downloadLilypond", () => {
	it("returns undefined when LilyPond has no prebuilt for this platform/arch", async () => {
		mockResolvePlatformTarget.mockReturnValue(undefined);
		const fetchImpl = vi.fn();
		const result = await downloadLilypond({
			version: "2.26.0",
			cacheDir: "/cache",
			fetchImpl,
		});
		expect(result).toBeUndefined();
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("skips downloading and returns the binary path when already installed", async () => {
		mockAccess.mockResolvedValueOnce(undefined);
		const fetchImpl = vi.fn();
		const result = await downloadLilypond({
			version: "2.26.0",
			cacheDir: "/cache",
			fetchImpl,
		});
		expect(fetchImpl).not.toHaveBeenCalled();
		expect(result).toContain("lilypond-2.26.0-");
	});

	it("downloads, verifies the checksum, extracts via tar, and installs", async () => {
		const fetchImpl = vi.fn().mockResolvedValue(fakeResponse({}));
		const result = await downloadLilypond({
			version: "2.26.0",
			cacheDir: "/cache",
			fetchImpl,
		});

		expect(fetchImpl).toHaveBeenCalledWith(
			expect.stringContaining(
				"gitlab.com/api/v4/projects/lilypond%2Flilypond/packages/generic/lilypond/2.26.0/",
			),
		);
		expect(mockExecFile.mock.calls[0]?.[0]).toBe("tar");
		expect(mockExecFile.mock.calls[0]?.[1]).toEqual(
			expect.arrayContaining(["-xf"]),
		);
		expect(mockRename).toHaveBeenCalled();
		expect(mockWriteFile).toHaveBeenCalledWith(
			expect.stringContaining(".complete"),
			"",
		);
		expect(result).toMatch(/bin[/\\]lilypond$/);
	});

	it("throws on a checksum mismatch and does not install", async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValue(fakeResponse({ checksum: "0".repeat(64) }));
		await expect(
			downloadLilypond({ version: "2.26.0", cacheDir: "/cache", fetchImpl }),
		).rejects.toThrow(/checksum mismatch/);
		expect(mockRename).not.toHaveBeenCalled();
	});

	it("proceeds without verification when the response has no checksum header", async () => {
		const log = vi.fn();
		const fetchImpl = vi
			.fn()
			.mockResolvedValue(fakeResponse({ checksum: null }));
		const result = await downloadLilypond({
			version: "2.26.0",
			cacheDir: "/cache",
			fetchImpl,
			log,
		});
		expect(result).toBeDefined();
		expect(log).toHaveBeenCalledWith(expect.stringContaining("no checksum"));
	});

	it("throws when the HTTP response is not ok", async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValue(fakeResponse({ ok: false, status: 404 }));
		await expect(
			downloadLilypond({ version: "2.26.0", cacheDir: "/cache", fetchImpl }),
		).rejects.toThrow(/404/);
	});

	it("throws when the extracted archive is empty", async () => {
		mockReaddir.mockResolvedValueOnce([]);
		const fetchImpl = vi.fn().mockResolvedValue(fakeResponse({}));
		await expect(
			downloadLilypond({ version: "2.26.0", cacheDir: "/cache", fetchImpl }),
		).rejects.toThrow(/empty/);
	});
});
