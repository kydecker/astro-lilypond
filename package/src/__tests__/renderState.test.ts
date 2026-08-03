import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../binary/index.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../binary/index.js")>();
	return {
		...actual,
		resolveLilypondBinary: vi.fn(
			async ({
				log,
				warn,
			}: {
				log?: (message: string) => void;
				warn?: (message: string) => void;
			}) => {
				log?.("downloading...");
				warn?.("not found on PATH");
				return "lilypond";
			},
		),
	};
});

import {
	getRenderState,
	resetRenderStateForTests,
	resolveAndSetRenderState,
	setRenderState,
} from "../renderState.js";

afterEach(() => {
	resetRenderStateForTests();
});

describe("renderState", () => {
	it("throws a clear, actionable error when read before being set", () => {
		expect(() => getRenderState()).toThrow(/lilypond\(\).*Astro config/s);
	});

	it("returns whatever was last set", () => {
		setRenderState({
			binaryPath: "lilypond",
			defaults: { version: "2.26.0" },
			timeout: 60_000,
			isDev: false,
		});
		expect(getRenderState()).toEqual({
			binaryPath: "lilypond",
			defaults: { version: "2.26.0" },
			timeout: 60_000,
			isDev: false,
		});
	});

	it("overwrites a previous value on a second call", () => {
		setRenderState({
			binaryPath: "a",
			defaults: undefined,
			timeout: undefined,
			isDev: false,
		});
		setRenderState({
			binaryPath: "b",
			defaults: undefined,
			timeout: 5000,
			isDev: true,
		});
		expect(getRenderState()).toEqual({
			binaryPath: "b",
			defaults: undefined,
			timeout: 5000,
			isDev: true,
		});
	});

	it("throws again after being reset", () => {
		setRenderState({
			binaryPath: "lilypond",
			defaults: undefined,
			timeout: undefined,
			isDev: false,
		});
		resetRenderStateForTests();
		expect(() => getRenderState()).toThrow(/lilypond\(\).*Astro config/s);
	});
});

describe("resolveAndSetRenderState", () => {
	it("forwards resolveLilypondBinary's log/warn callbacks to the provided logger", async () => {
		const logger = { info: vi.fn(), warn: vi.fn() };

		const binaryPath = await resolveAndSetRenderState({
			defaults: { version: "2.26.0" },
			timeout: 60_000,
			isDev: true,
			logger,
		});

		expect(logger.info).toHaveBeenCalledWith("downloading...");
		expect(logger.warn).toHaveBeenCalledWith("not found on PATH");
		expect(binaryPath).toBe("lilypond");
		expect(getRenderState()).toEqual({
			binaryPath: "lilypond",
			defaults: { version: "2.26.0" },
			timeout: 60_000,
			isDev: true,
		});
	});
});
