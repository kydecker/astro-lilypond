import { describe, expect, it } from "vitest";
import { prependVersion } from "./prependVersion.js";

describe("prependVersion", () => {
	it("prepends \\version when the source doesn't declare it", () => {
		expect(prependVersion("\\score { }", "2.24.0")).toBe(
			'\\version "2.24.0"\n\\score { }',
		);
	});

	it("does not prepend when the source already declares \\version", () => {
		const source = '\\version "2.22.0"\n\\score { }';
		expect(prependVersion(source, "2.24.0")).toBe(source);
	});

	it("detects \\version anywhere in the source, not just at the start", () => {
		const source = '% a comment\n\\version "2.22.0"\n\\score { }';
		expect(prependVersion(source, "2.24.0")).toBe(source);
	});

	it("does not treat plain text containing 'version' as a declaration", () => {
		const source = "% versioning notes\n\\score { }";
		expect(prependVersion(source, "2.24.0")).toBe(
			`\\version "2.24.0"\n${source}`,
		);
	});

	it("does not mistake a hypothetical \\versioning command for \\version", () => {
		const source = "\\versioning { }";
		expect(prependVersion(source, "2.24.0")).toBe(
			`\\version "2.24.0"\n${source}`,
		);
	});

	it("handles an empty source string", () => {
		expect(prependVersion("", "2.24.0")).toBe('\\version "2.24.0"\n');
	});
});
