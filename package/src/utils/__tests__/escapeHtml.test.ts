import { describe, expect, it } from "vitest";
import { escapeHtml } from "../escapeHtml.js";

describe("escapeHtml", () => {
	it("escapes &", () => {
		expect(escapeHtml("Bach & Sons")).toBe("Bach &amp; Sons");
	});

	it("escapes <", () => {
		expect(escapeHtml("a < b")).toBe("a &lt; b");
	});

	it("escapes >", () => {
		expect(escapeHtml("a > b")).toBe("a &gt; b");
	});

	it("escapes & before other entities so it isn't double-escaped", () => {
		expect(escapeHtml("<a>Bach & Sons</a>")).toBe(
			"&lt;a&gt;Bach &amp; Sons&lt;/a&gt;",
		);
	});

	it("leaves plain text untouched", () => {
		expect(escapeHtml("fatal error: bad input")).toBe("fatal error: bad input");
	});
});
