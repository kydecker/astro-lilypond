import { afterEach, describe, expect, it, vi } from "vitest";
import { getLogger, resetLoggerForTests, setLogger } from "../logger.js";

afterEach(() => {
	resetLoggerForTests();
});

describe("logger", () => {
	const logger = { warn: vi.fn(), error: vi.fn() };

	it("throws an error when read before being set", () => {
		expect(() => getLogger()).toThrow(/lilypond\(\).*Astro config/s);
	});

	it("returns whatever was last set", () => {
		setLogger(logger);
		expect(getLogger()).toBe(logger);
	});

	it("overwrites a previous value on a second call", () => {
		const a = { warn: vi.fn(), error: vi.fn() };
		const b = { warn: vi.fn(), error: vi.fn() };
		setLogger(a);
		setLogger(b);
		expect(getLogger()).toBe(b);
	});

	it("throws again after being reset", () => {
		setLogger(logger);
		resetLoggerForTests();
		expect(() => getLogger()).toThrow(/lilypond\(\).*Astro config/s);
	});
});
