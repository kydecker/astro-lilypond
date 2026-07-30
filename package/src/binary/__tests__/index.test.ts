import { describe, expect, it } from "vitest";
import {
	DEFAULT_LILYPOND_VERSION,
	downloadLilypond,
	lilypondCacheDir,
	resolveAutoInstallOption,
	resolveLilypondBinary,
	resolvePlatformTarget,
} from "../index.js";

describe("binary/index", () => {
	it("re-exports the binary module's public API", () => {
		expect(typeof resolveAutoInstallOption).toBe("function");
		expect(typeof lilypondCacheDir).toBe("function");
		expect(typeof downloadLilypond).toBe("function");
		expect(typeof resolvePlatformTarget).toBe("function");
		expect(typeof resolveLilypondBinary).toBe("function");
		expect(DEFAULT_LILYPOND_VERSION).toBe("2.26.0");
	});
});
