import { describe, expect, it } from "vitest";
import { lyTypeDeclarationsFor } from "../lyTypeDeclarationsFor.js";

describe("lyTypeDeclarationsFor", () => {
	it("declares a bare module for each extension", () => {
		const content = lyTypeDeclarationsFor([".ly", ".ily"]);
		expect(content).toContain('declare module "*.ly"');
		expect(content).toContain('declare module "*.ily"');
	});

	it("each declaration exports a default LilypondScore value", () => {
		const content = lyTypeDeclarationsFor([".ly", ".lilypond", ".ily"]);
		expect(content.match(/export default score/g)?.length).toBe(3);
		expect(content.match(/LilypondScore/g)?.length).toBe(3);
	});
});
