import { beforeEach, describe, expect, it, vi } from "vitest";

type ExecFileCb = (
	err: unknown,
	res?: { stdout: string; stderr: string },
) => void;

function enoentError() {
	return Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" });
}

vi.mock("child_process", () => ({
	execFile: vi.fn(
		(_bin: string, _args: string[], _options: unknown, cb: ExecFileCb) => {
			cb(enoentError());
		},
	),
}));

vi.mock("../downloadLilypond.js", () => ({
	downloadLilypond: vi.fn(),
}));

vi.mock("../platformTarget.js", () => ({
	resolvePlatformTarget: vi.fn(() => ({
		platform: "linux",
		arch: "x86_64",
		archiveExt: "tar.gz",
		binaryName: "lilypond",
	})),
}));

import { execFile } from "node:child_process";
import { downloadLilypond } from "../downloadLilypond.js";
import { resolvePlatformTarget } from "../platformTarget.js";
import {
	DEFAULT_LILYPOND_VERSION,
	resolveLilypondBinary,
} from "../resolveLilypondBinary.js";

const mockExecFile = vi.mocked(execFile);
const mockDownloadLilypond = vi.mocked(downloadLilypond);
const mockResolvePlatformTarget = vi.mocked(resolvePlatformTarget);

function mockExecFileResult(
	handler: (cb: ExecFileCb) => void,
	captureOptions?: (options: unknown) => void,
) {
	mockExecFile.mockImplementation(((
		_bin: string,
		_args: string[],
		options: unknown,
		cb: ExecFileCb,
	) => {
		captureOptions?.(options);
		handler(cb);
	}) as unknown as typeof execFile);
}

beforeEach(() => {
	vi.clearAllMocks();
	mockExecFileResult((cb) => cb(enoentError()));
	mockResolvePlatformTarget.mockReturnValue({
		platform: "linux",
		arch: "x86_64",
		archiveExt: "tar.gz",
		binaryName: "lilypond",
	});
});

describe("resolveLilypondBinary", () => {
	it("returns the bare command when lilypond is already on PATH", async () => {
		mockExecFileResult((cb) =>
			cb(null, { stdout: "GNU LilyPond 2.26.0", stderr: "" }),
		);
		const result = await resolveLilypondBinary({
			version: "2.26.0",
			autoInstall: true,
		});
		expect(result).toBe("lilypond");
		expect(mockDownloadLilypond).not.toHaveBeenCalled();
	});

	it("passes an AbortSignal timeout to the PATH check", async () => {
		let capturedOptions: { signal?: AbortSignal } = {};
		mockExecFileResult(
			(cb) => cb(null, { stdout: "", stderr: "" }),
			(options) => {
				capturedOptions = options as { signal?: AbortSignal };
			},
		);
		await resolveLilypondBinary({ version: "2.26.0", autoInstall: true });
		expect(capturedOptions.signal).toBeInstanceOf(AbortSignal);
	});

	it("treats a lilypond on PATH that errors for a reason other than ENOENT as present", async () => {
		mockExecFileResult((cb) =>
			cb(Object.assign(new Error("permission denied"), { code: "EACCES" })),
		);
		const result = await resolveLilypondBinary({
			version: "2.26.0",
			autoInstall: true,
		});
		expect(result).toBe("lilypond");
		expect(mockDownloadLilypond).not.toHaveBeenCalled();
	});

	it("does not download when autoInstall is false, and warns instead", async () => {
		const warn = vi.fn();
		const result = await resolveLilypondBinary({
			version: "2.26.0",
			autoInstall: false,
			warn,
		});
		expect(result).toBe("lilypond");
		expect(mockDownloadLilypond).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining("No `lilypond` binary found on PATH"),
		);
	});

	it("downloads and returns the installed binary path when not on PATH and autoInstall is enabled", async () => {
		mockDownloadLilypond.mockResolvedValue(
			"/cache/lilypond-2.26.0/bin/lilypond",
		);
		const result = await resolveLilypondBinary({
			version: "2.26.0",
			autoInstall: true,
		});
		expect(mockDownloadLilypond).toHaveBeenCalledWith(
			expect.objectContaining({ version: "2.26.0" }),
		);
		expect(result).toBe("/cache/lilypond-2.26.0/bin/lilypond");
	});

	it("warns and falls back to the bare command when there's no prebuilt for this platform", async () => {
		mockResolvePlatformTarget.mockReturnValue(undefined);
		const warn = vi.fn();
		const result = await resolveLilypondBinary({
			version: "2.26.0",
			autoInstall: true,
			warn,
		});
		expect(result).toBe("lilypond");
		expect(mockDownloadLilypond).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("no prebuilt"));
	});

	it("downloads DEFAULT_LILYPOND_VERSION when no version is given", async () => {
		mockDownloadLilypond.mockResolvedValue("/cache/lilypond/bin/lilypond");
		await resolveLilypondBinary({ autoInstall: true });
		expect(mockDownloadLilypond).toHaveBeenCalledWith(
			expect.objectContaining({ version: DEFAULT_LILYPOND_VERSION }),
		);
	});

	it("throws when the download fails, instead of silently falling back", async () => {
		mockDownloadLilypond.mockRejectedValue(new Error("network unreachable"));
		await expect(
			resolveLilypondBinary({ version: "2.26.0", autoInstall: true }),
		).rejects.toThrow("network unreachable");
	});

	it("stringifies a non-Error rejection in the thrown message", async () => {
		mockDownloadLilypond.mockRejectedValue("disk full");
		await expect(
			resolveLilypondBinary({ version: "2.26.0", autoInstall: true }),
		).rejects.toThrow("disk full");
	});

	it("falls back to the bare command when downloadLilypond resolves with no path", async () => {
		mockDownloadLilypond.mockResolvedValue(undefined);
		const result = await resolveLilypondBinary({
			version: "2.26.0",
			autoInstall: true,
		});
		expect(result).toBe("lilypond");
	});

	it("uses a no-op warn by default when autoInstall is false", async () => {
		const result = await resolveLilypondBinary({
			version: "2.26.0",
			autoInstall: false,
		});
		expect(result).toBe("lilypond");
	});

	it("uses a no-op log by default when downloading", async () => {
		mockDownloadLilypond.mockImplementation(async ({ log }) => {
			log?.("downloading...");
			return "/cache/lilypond/bin/lilypond";
		});
		const result = await resolveLilypondBinary({
			version: "2.26.0",
			autoInstall: true,
		});
		expect(result).toBe("/cache/lilypond/bin/lilypond");
	});
});
