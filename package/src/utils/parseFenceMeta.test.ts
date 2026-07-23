import { describe, expect, it } from "vitest";
import { parseFenceMeta } from "./parseFenceMeta.js";

describe("parseFenceMeta", () => {
	it("returns undefined for undefined meta", () => {
		expect(parseFenceMeta(undefined)).toBeUndefined();
	});

	it("returns undefined for null meta", () => {
		expect(parseFenceMeta(null)).toBeUndefined();
	});

	it("returns undefined for an empty meta string", () => {
		expect(parseFenceMeta("")).toBeUndefined();
	});

	it("returns undefined when meta has content but no alt=", () => {
		expect(parseFenceMeta('title="foo"')).toBeUndefined();
	});

	it("extracts a simple alt value", () => {
		expect(parseFenceMeta('alt="Sonata"')).toBe("Sonata");
	});

	it('extracts alt="" as an explicit empty string', () => {
		expect(parseFenceMeta('alt=""')).toBe("");
	});

	it("handles escaped quotes inside the value", () => {
		expect(parseFenceMeta('alt="Sonata \\"No. 14\\""')).toBe('Sonata "No. 14"');
	});

	it("ignores unrelated key=value pairs mixed into the meta string", () => {
		expect(parseFenceMeta('title="x" alt="y"')).toBe("y");
	});

	it('ignores a hyphenated key that merely ends in "alt"', () => {
		expect(parseFenceMeta('data-alt="internal"')).toBeUndefined();
	});

	it("returns undefined for malformed/unterminated quoting", () => {
		expect(parseFenceMeta('alt="Sonata')).toBeUndefined();
	});
});
