import { describe, expect, it } from "vitest";
import {
	altTextFor,
	altTextForBlock,
	emitLilypondAsset,
	emitLilypondPdfAsset,
	escapeHtmlAttribute,
	extractMarkupText,
	imageDimensionsFor,
	includePathsFor,
	isLilypondLang,
	lyTypeDeclarationsFor,
	parseFenceMeta,
	parseLyHeader,
	parseLyHeaderFields,
	prependVersion,
	renderedHtml,
	resolveDefaults,
	STANDARD_HEADER_FIELDS,
	sourceNameFor,
	titleFor,
	toLilypondMetadata,
	unescapeQuoted,
} from "../index.js";

describe("utils/index", () => {
	it("re-exports the utils module's public API", () => {
		expect(typeof altTextFor).toBe("function");
		expect(typeof altTextForBlock).toBe("function");
		expect(typeof emitLilypondAsset).toBe("function");
		expect(typeof emitLilypondPdfAsset).toBe("function");
		expect(typeof escapeHtmlAttribute).toBe("function");
		expect(typeof extractMarkupText).toBe("function");
		expect(typeof imageDimensionsFor).toBe("function");
		expect(typeof includePathsFor).toBe("function");
		expect(typeof isLilypondLang).toBe("function");
		expect(typeof lyTypeDeclarationsFor).toBe("function");
		expect(typeof parseFenceMeta).toBe("function");
		expect(typeof parseLyHeader).toBe("function");
		expect(typeof parseLyHeaderFields).toBe("function");
		expect(typeof prependVersion).toBe("function");
		expect(typeof renderedHtml).toBe("function");
		expect(typeof resolveDefaults).toBe("function");
		expect(typeof sourceNameFor).toBe("function");
		expect(typeof titleFor).toBe("function");
		expect(typeof toLilypondMetadata).toBe("function");
		expect(typeof unescapeQuoted).toBe("function");
		expect(Array.isArray(STANDARD_HEADER_FIELDS)).toBe(true);
	});
});
