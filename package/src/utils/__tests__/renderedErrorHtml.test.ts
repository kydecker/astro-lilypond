import { describe, expect, it } from "vitest";
import { renderedErrorHtml } from "../renderedErrorHtml.js";

describe("renderedErrorHtml", () => {
	it("renders an Error's message alongside the title", () => {
		const html = renderedErrorHtml(
			new Error("fatal error: bad input"),
			"my-score",
		);
		expect(html).toContain("my-score");
		expect(html).toContain("fatal error: bad input");
		expect(html.startsWith("<pre style=")).toBe(true);
		expect(html.endsWith("</pre>")).toBe(true);
	});

	it("stringifies a non-Error rejection", () => {
		expect(renderedErrorHtml("boom", "score")).toContain("boom");
	});

	it("escapes special characters in both the title and the message", () => {
		const html = renderedErrorHtml(
			new Error('<script>alert("x")</script>'),
			'<b>"title"</b>',
		);
		expect(html).not.toContain("<script>");
		expect(html).not.toContain("<b>");
		expect(html).toContain("&lt;script&gt;");
		expect(html).toContain("&lt;b&gt;");
	});

	it("resets inherited styles before declaring its own", () => {
		const html = renderedErrorHtml(new Error("x"), "score");
		expect(html).toContain("all: initial");
		expect(html).toContain("white-space: pre-wrap");
	});

	it("has no class, style override, or data attribute surface", () => {
		const html = renderedErrorHtml(new Error("x"), "score");
		expect(html).not.toMatch(/\bdata-lilypond-error\b/);
		expect(html.match(/style="/g)?.length).toBe(1);
	});

	it("supports both light and dark color schemes via light-dark(), without a stylesheet", () => {
		const html = renderedErrorHtml(new Error("x"), "score");
		expect(html).toContain("color-scheme: light dark");
		expect(html).toContain("light-dark(#dc2626, #f87171)");
		expect(html).toContain("light-dark(#fef2f2, #450a0a)");
		expect(html).toContain("light-dark(#7f1d1d, #fca5a5)");
	});
});
