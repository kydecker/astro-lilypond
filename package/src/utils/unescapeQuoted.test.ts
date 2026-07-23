import { describe, expect, it } from "vitest";
import { unescapeQuoted } from "./unescapeQuoted.js";

describe("unescapeQuoted", () => {
	it("returns a string with no escapes unchanged", () => {
		expect(unescapeQuoted("Sonata")).toBe("Sonata");
	});

	it('unescapes \\" to "', () => {
		expect(unescapeQuoted('Sonata \\"No. 14\\"')).toBe('Sonata "No. 14"');
	});

	it("unescapes \\\\ to \\", () => {
		expect(unescapeQuoted("C:\\\\Scores")).toBe("C:\\Scores");
	});
});
