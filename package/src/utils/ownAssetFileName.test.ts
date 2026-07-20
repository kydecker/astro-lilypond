import { describe, expect, it } from "vitest";
import { contentTypeFor, isOwnAssetFileName } from "./ownAssetFileName.js";

describe("isOwnAssetFileName", () => {
	it("matches our own <hash>.<title>.<format> naming", () => {
		expect(isOwnAssetFileName("ab12ef.bach-bwv610.svg")).toBe(true);
		expect(isOwnAssetFileName("ab12ef.bach-bwv610.png")).toBe(true);
	});

	it("rejects a missing title segment", () => {
		expect(isOwnAssetFileName("ab12ef.svg")).toBe(false);
	});

	it("rejects a non-hex hash segment", () => {
		expect(isOwnAssetFileName("not-hex.score.svg")).toBe(false);
	});

	it("rejects an unsupported extension", () => {
		expect(isOwnAssetFileName("ab12ef.score.txt")).toBe(false);
	});

	it("rejects traversal-shaped names, including backslash-based ones", () => {
		expect(isOwnAssetFileName("../../etc/passwd.svg")).toBe(false);
		expect(isOwnAssetFileName("..\\..\\secret.svg")).toBe(false);
	});
});

describe("contentTypeFor", () => {
	it("returns the content type for a valid svg asset name", () => {
		expect(contentTypeFor("ab12ef.score.svg")).toBe("image/svg+xml");
	});

	it("returns the content type for a valid png asset name", () => {
		expect(contentTypeFor("ab12ef.score.png")).toBe("image/png");
	});

	it("returns undefined for a name that isn't one of our own assets", () => {
		expect(contentTypeFor("readme.md")).toBeUndefined();
	});
});
