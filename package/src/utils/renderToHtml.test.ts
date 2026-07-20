import { describe, expect, it } from "vitest";
import { renderToHtml } from "./renderToHtml.js";

describe("renderToHtml", () => {
	it("embeds a base64 data-URI <img> for format 'svg'", () => {
		const buf = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
		const out = renderToHtml(buf, "svg");
		expect(out).toBe(
			`<img class="lilypond" src="data:image/svg+xml;base64,${buf.toString("base64")}" alt="">`,
		);
	});

	it("embeds a base64 data-URI <img> for format 'png'", () => {
		const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
		const out = renderToHtml(buf, "png");
		expect(out).toBe(
			`<img class="lilypond" src="data:image/png;base64,${buf.toString("base64")}" alt="">`,
		);
	});
});
