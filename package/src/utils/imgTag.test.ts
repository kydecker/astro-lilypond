import { describe, expect, it } from "vitest";
import { imgTag } from "./imgTag.js";

describe("imgTag", () => {
	it("wraps the given src in a lilypond img tag", () => {
		expect(imgTag("/_lilypond/abc123.svg")).toBe(
			'<img class="lilypond" src="/_lilypond/abc123.svg" alt="">',
		);
	});
});
