import { afterEach, describe, expect, it } from "vitest";
import {
	getRenderState,
	resetRenderStateForTests,
	setRenderState,
} from "./renderState.js";

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
		});
		expect(getRenderState()).toEqual({
			binaryPath: "lilypond",
			defaults: { version: "2.26.0" },
			timeout: 60_000,
		});
	});

	it("overwrites a previous value on a second call", () => {
		setRenderState({
			binaryPath: "a",
			defaults: undefined,
			timeout: undefined,
		});
		setRenderState({ binaryPath: "b", defaults: undefined, timeout: 5000 });
		expect(getRenderState()).toEqual({
			binaryPath: "b",
			defaults: undefined,
			timeout: 5000,
		});
	});

	it("throws again after being reset", () => {
		setRenderState({
			binaryPath: "lilypond",
			defaults: undefined,
			timeout: undefined,
		});
		resetRenderStateForTests();
		expect(() => getRenderState()).toThrow(/lilypond\(\).*Astro config/s);
	});
});
