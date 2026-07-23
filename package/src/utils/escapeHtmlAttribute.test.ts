import { describe, expect, it } from "vitest";
import { escapeHtmlAttribute } from "./escapeHtmlAttribute.js";

describe("escapeHtmlAttribute", () => {
	it("escapes &", () => {
		expect(escapeHtmlAttribute("Bach & Sons")).toBe("Bach &amp; Sons");
	});

	it('escapes "', () => {
		expect(escapeHtmlAttribute('Sonata "No. 14"')).toBe(
			"Sonata &quot;No. 14&quot;",
		);
	});

	it("escapes <", () => {
		expect(escapeHtmlAttribute("a < b")).toBe("a &lt; b");
	});

	it("escapes & before other entities so it isn't double-escaped", () => {
		expect(escapeHtmlAttribute('<a href="x">Bach & Sons')).toBe(
			"&lt;a href=&quot;x&quot;>Bach &amp; Sons",
		);
	});
});
