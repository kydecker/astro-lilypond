import { describe, expect, it } from "vitest";
import { lyTypeDeclarationsFor } from "./lyTypeDeclarationsFor.js";

describe("lyTypeDeclarationsFor", () => {
	it("declares a bare module for each extension", () => {
		const content = lyTypeDeclarationsFor([".ly", ".ily"], []);
		expect(content).toContain('declare module "*.ly"');
		expect(content).toContain('declare module "*.ily"');
	});

	it("declares a module per extension for each query param", () => {
		const content = lyTypeDeclarationsFor([".ly"], ["crop", "nocrop"]);
		expect(content).toContain('declare module "*.ly?crop"');
		expect(content).toContain('declare module "*.ly?nocrop"');
	});

	it("each declaration exports a default LilypondContent value", () => {
		const content = lyTypeDeclarationsFor(
			[".ly", ".lilypond", ".ily"],
			["crop", "nocrop"],
		);
		expect(content.match(/export default content/g)?.length).toBe(9);
		expect(content.match(/LilypondContent/g)?.length).toBe(9);
	});
});
