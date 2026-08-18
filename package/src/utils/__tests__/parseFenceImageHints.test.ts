import { describe, expect, it } from "vitest";
import { parseFenceImageHints } from "../parseFenceImageHints.js";

describe("parseFenceImageHints", () => {
	it("returns an empty object for undefined meta", () => {
		expect(parseFenceImageHints(undefined)).toEqual({});
	});

	it("returns an empty object for null meta", () => {
		expect(parseFenceImageHints(null)).toEqual({});
	});

	it("returns an empty object for an empty meta string", () => {
		expect(parseFenceImageHints("")).toEqual({});
	});

	it("returns an empty object when meta has content but no recognised hints", () => {
		expect(parseFenceImageHints('title="foo"')).toEqual({});
	});

	it('extracts loading="lazy"', () => {
		expect(parseFenceImageHints('loading="lazy"')).toEqual({ loading: "lazy" });
	});

	it('extracts loading="eager"', () => {
		expect(parseFenceImageHints('loading="eager"')).toEqual({
			loading: "eager",
		});
	});

	it('extracts decoding="async"', () => {
		expect(parseFenceImageHints('decoding="async"')).toEqual({
			decoding: "async",
		});
	});

	it('extracts decoding="sync"', () => {
		expect(parseFenceImageHints('decoding="sync"')).toEqual({
			decoding: "sync",
		});
	});

	it('extracts decoding="auto"', () => {
		expect(parseFenceImageHints('decoding="auto"')).toEqual({
			decoding: "auto",
		});
	});

	it('extracts fetchpriority="high"', () => {
		expect(parseFenceImageHints('fetchpriority="high"')).toEqual({
			fetchpriority: "high",
		});
	});

	it('extracts fetchpriority="low"', () => {
		expect(parseFenceImageHints('fetchpriority="low"')).toEqual({
			fetchpriority: "low",
		});
	});

	it('extracts fetchpriority="auto"', () => {
		expect(parseFenceImageHints('fetchpriority="auto"')).toEqual({
			fetchpriority: "auto",
		});
	});

	it('extracts priority="true" as a boolean', () => {
		expect(parseFenceImageHints('priority="true"')).toEqual({
			priority: true,
		});
	});

	it('extracts priority="false" as a boolean', () => {
		expect(parseFenceImageHints('priority="false"')).toEqual({
			priority: false,
		});
	});

	it("ignores invalid loading/decoding/fetchpriority/priority values", () => {
		expect(
			parseFenceImageHints(
				'loading="garbage" decoding="maybe" fetchpriority="urgent" priority="yes"',
			),
		).toEqual({});
	});

	it("extracts all four hints mixed with an unrelated key=value pair", () => {
		expect(
			parseFenceImageHints(
				'alt="Sonata" loading="lazy" decoding="async" fetchpriority="high" priority="true"',
			),
		).toEqual({
			loading: "lazy",
			decoding: "async",
			fetchpriority: "high",
			priority: true,
		});
	});

	it("does not confuse fetchpriority with priority", () => {
		// `priority` must be a standalone key, not the tail of `fetchpriority`.
		expect(parseFenceImageHints('fetchpriority="high"')).toEqual({
			fetchpriority: "high",
		});
		expect(
			parseFenceImageHints('fetchpriority="high" priority="true"'),
		).toEqual({ fetchpriority: "high", priority: true });
	});

	it("ignores a hyphenated key that merely ends in a recognised name", () => {
		// Matches parseFenceMeta's guard against `data-alt="…"`.
		expect(parseFenceImageHints('data-loading="lazy"')).toEqual({});
		expect(parseFenceImageHints('x-fetchpriority="high"')).toEqual({});
	});
});
