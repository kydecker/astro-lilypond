import { describe, expect, it } from "vitest";
import { resolvePlatformTarget } from "./platformTarget.js";

describe("resolvePlatformTarget", () => {
	it("maps linux/x64 to linux-x86_64 tar.gz", () => {
		expect(resolvePlatformTarget("linux", "x64")).toEqual({
			platform: "linux",
			arch: "x86_64",
			archiveExt: "tar.gz",
			binaryName: "lilypond",
		});
	});

	it("maps darwin/arm64 to darwin-arm64 tar.gz", () => {
		expect(resolvePlatformTarget("darwin", "arm64")).toEqual({
			platform: "darwin",
			arch: "arm64",
			archiveExt: "tar.gz",
			binaryName: "lilypond",
		});
	});

	it("maps darwin/x64 to darwin-x86_64 tar.gz", () => {
		expect(resolvePlatformTarget("darwin", "x64")).toEqual({
			platform: "darwin",
			arch: "x86_64",
			archiveExt: "tar.gz",
			binaryName: "lilypond",
		});
	});

	it("maps win32/x64 to mingw-x86_64 zip with a .exe binary name", () => {
		expect(resolvePlatformTarget("win32", "x64")).toEqual({
			platform: "mingw",
			arch: "x86_64",
			archiveExt: "zip",
			binaryName: "lilypond.exe",
		});
	});

	it("returns undefined for combinations LilyPond doesn't publish, e.g. linux/arm64", () => {
		expect(resolvePlatformTarget("linux", "arm64")).toBeUndefined();
	});

	it("returns undefined for unsupported platforms, e.g. freebsd", () => {
		expect(resolvePlatformTarget("freebsd", "x64")).toBeUndefined();
	});
});
