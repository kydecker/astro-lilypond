import { beforeEach, describe, expect, it, vi } from "vitest";

type ExecFileCb = (
	err: unknown,
	res?: { stdout: string; stderr: string },
) => void;

vi.mock("child_process", () => ({
	execFile: vi.fn((_bin: string, _args: string[], cb: ExecFileCb) => {
		cb(Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" }));
	}),
}));

vi.mock("./downloadLilypond.js", () => ({
	downloadLilypond: vi.fn(),
}));

vi.mock("./platformTarget.js", () => ({
	resolvePlatformTarget: vi.fn(() => ({
		platform: "linux",
		arch: "x86_64",
		archiveExt: "tar.gz",
		binaryName: "lilypond",
	})),
}));

import { execFile } from "node:child_process";
import { downloadLilypond } from "./downloadLilypond.js";
import { resolvePlatformTarget } from "./platformTarget.js";
import {
	DEFAULT_LILYPOND_VERSION,
	resolveLilypondBinary,
} from "./resolveLilypondBinary.js";

const mockExecFile = vi.mocked(execFile);
const mockDownloadLilypond = vi.mocked(downloadLilypond);
const mockResolvePlatformTarget = vi.mocked(resolvePlatformTarget);

beforeEach(() => {
	vi.clearAllMocks();
	mockExecFile.mockImplementation(((
		_bin: string,
		_args: string[],
		cb: ExecFileCb,
	) => {
		cb(Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" }));
	}) as unknown as typeof execFile);
	mockResolvePlatformTarget.mockReturnValue({
		platform: "linux",
		arch: "x86_64",
		archiveExt: "tar.gz",
		binaryName: "lilypond",
	});
});

describe("resolveLilypondBinary", () => {
	it("returns the bare command when lilypond is already on PATH", async () => {
		mockExecFile.mockImplementation(((
			_bin: string,
			_args: string[],
			cb: ExecFileCb,
		) => {
			cb(null, { stdout: "GNU LilyPond 2.26.0", stderr: "" });
		}) as unknown as typeof execFile);
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
			expect.stringContaining("not found on PATH"),
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

	it("warns and falls back to the bare command when the download fails", async () => {
		mockDownloadLilypond.mockRejectedValue(new Error("network unreachable"));
		const warn = vi.fn();
		const result = await resolveLilypondBinary({
			version: "2.26.0",
			autoInstall: true,
			warn,
		});
		expect(result).toBe("lilypond");
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining("network unreachable"),
		);
	});
});
