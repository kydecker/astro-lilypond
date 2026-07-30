import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lilypondCacheDir } from "../cacheDir.js";

describe("lilypondCacheDir", () => {
	it("uses ~/Library/Caches on darwin", () => {
		expect(lilypondCacheDir({}, "darwin")).toBe(
			join(homedir(), "Library", "Caches", "astro-lilypond"),
		);
	});

	it("uses LOCALAPPDATA on win32", () => {
		expect(
			lilypondCacheDir(
				{ LOCALAPPDATA: "C:\\Users\\me\\AppData\\Local" },
				"win32",
			),
		).toBe(join("C:\\Users\\me\\AppData\\Local", "astro-lilypond", "Cache"));
	});

	it("falls back to a default AppData path on win32 without LOCALAPPDATA", () => {
		expect(lilypondCacheDir({}, "win32")).toBe(
			join(homedir(), "AppData", "Local", "astro-lilypond", "Cache"),
		);
	});

	it("uses XDG_CACHE_HOME on linux when set", () => {
		expect(lilypondCacheDir({ XDG_CACHE_HOME: "/xdg/cache" }, "linux")).toBe(
			join("/xdg/cache", "astro-lilypond"),
		);
	});

	it("falls back to ~/.cache on linux without XDG_CACHE_HOME", () => {
		expect(lilypondCacheDir({}, "linux")).toBe(
			join(homedir(), ".cache", "astro-lilypond"),
		);
	});

	it("honors ASTRO_LILYPOND_CACHE_DIR on any platform", () => {
		expect(
			lilypondCacheDir({ ASTRO_LILYPOND_CACHE_DIR: "/custom/cache" }, "darwin"),
		).toBe("/custom/cache");
	});
});
