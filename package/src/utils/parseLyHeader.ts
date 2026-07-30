import { unescapeQuoted } from "./unescapeQuoted.js";

export interface LyHeaderFields {
	title?: string;
	composer?: string;
}

/** Finds the index of the `"` that closes the quoted string starting at `source[quoteIndex]`, honoring backslash escapes. Returns -1 if unterminated. */
function matchQuotedStringEnd(source: string, quoteIndex: number): number {
	for (let i = quoteIndex + 1; i < source.length; i++) {
		if (source[i] === "\\") {
			i++;
			continue;
		}
		if (source[i] === '"') return i;
	}
	return -1;
}

/** Finds the index of the `}` that closes the brace opened at `source[openBraceIndex]`, matching by depth (ignoring braces inside quoted strings). Returns -1 if unterminated. */
function matchBalancedBraces(source: string, openBraceIndex: number): number {
	let depth = 1;
	let inString = false;
	for (let i = openBraceIndex + 1; i < source.length; i++) {
		const ch = source[i];
		if (inString) {
			if (ch === "\\") i++;
			else if (ch === '"') inString = false;
			continue;
		}
		if (ch === '"') inString = true;
		else if (ch === "{") depth++;
		else if (ch === "}") {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

/**
 * Strips LilyPond `%` line comments and `%{ ... %}` block comments from
 * `source`, replacing their text with spaces (so offsets are unaffected) —
 * quote-aware, so a literal `%` inside a `"..."` string (e.g. `"50% done"`)
 * is left alone. Run once, up front, so neither the `\header {` block scan
 * nor the field scan inside a block can mistake commented-out text for real
 * source.
 */
function stripComments(source: string): string {
	let result = "";
	let inString = false;
	for (let i = 0; i < source.length; i++) {
		const ch = source[i];
		if (inString) {
			result += ch;
			if (ch === "\\") {
				i++;
				result += source[i] ?? "";
			} else if (ch === '"') {
				inString = false;
			}
			continue;
		}
		if (ch === '"') {
			inString = true;
			result += ch;
			continue;
		}
		if (ch === "%" && source[i + 1] === "{") {
			const end = source.indexOf("%}", i + 2);
			const stop = end === -1 ? source.length : end + 2;
			result += " ".repeat(stop - i);
			i = stop - 1;
			continue;
		}
		if (ch === "%") {
			const end = source.indexOf("\n", i);
			const stop = end === -1 ? source.length : end;
			result += " ".repeat(stop - i);
			i = stop - 1;
			continue;
		}
		result += ch;
	}
	return result;
}

/** Returns the body of every top-level `\header { ... }` block in `source` — there may be more than one (e.g. book-level metadata plus a per-`\score` override). */
function allHeaderBodies(source: string): string[] {
	const bodies: string[] = [];
	const headerRe = /\\header\s*\{/g;
	let match: RegExpExecArray | null;
	// biome-ignore lint: reassigned in the while condition
	while ((match = headerRe.exec(source))) {
		const openBraceIndex = match.index + match[0].length - 1;
		const closeBraceIndex = matchBalancedBraces(source, openBraceIndex);
		if (closeBraceIndex === -1) continue;
		bodies.push(source.slice(openBraceIndex + 1, closeBraceIndex));
		headerRe.lastIndex = closeBraceIndex + 1;
	}
	return bodies;
}

/** Consumes one Scheme datum starting at `source[i]` (which must be `#`): a boolean/number/symbol atom, or a balanced, quote-aware parenthesized list (e.g. `#4`, `#f`, `#'symbol`, `#'(0 . 3)`, `#(format #f "...")`). Returns the index just past it. */
function skipSchemeDatum(source: string, i: number): number {
	i++; // past '#'
	if (source[i] === "'") i++; // optional quote prefix
	if (source[i] === "(") {
		let depth = 0;
		let inString = false;
		do {
			const ch = source[i];
			if (inString) {
				if (ch === "\\") i++;
				else if (ch === '"') inString = false;
			} else if (ch === '"') {
				inString = true;
			} else if (ch === "(") {
				depth++;
			} else if (ch === ")") {
				depth--;
			}
			i++;
		} while (i < source.length && depth > 0);
		return i;
	}
	if (source[i] === '"') {
		const end = matchQuotedStringEnd(source, i);
		return end === -1 ? source.length : end + 1;
	}
	while (i < source.length && !/[\s{}()"#\\]/.test(source[i])) i++;
	return i;
}

/**
 * Extracts readable plain text from inside a `\markup { ... }` block: quoted-string
 * contents and bare words are kept, `\command` tokens and `#...` Scheme literal
 * arguments (font sizes, colors, alist overrides, etc.) are stripped, and nested
 * `{ }` grouping is flattened — good enough for the formatting-wrapped text
 * commonly seen in real `\header` fields (e.g. `\markup { \bold "Sonata" }`),
 * not a full markup-language evaluator.
 */
export function extractMarkupText(markupInner: string): string {
	const tokens: string[] = [];
	const n = markupInner.length;
	let i = 0;
	while (i < n) {
		const ch = markupInner[i];
		if (/\s/.test(ch)) {
			i++;
			continue;
		}
		if (ch === '"') {
			const end = matchQuotedStringEnd(markupInner, i);
			if (end === -1) break;
			tokens.push(unescapeQuoted(markupInner.slice(i + 1, end)));
			i = end + 1;
			continue;
		}
		if (ch === "{" || ch === "}") {
			i++;
			continue;
		}
		if (ch === "#") {
			i = skipSchemeDatum(markupInner, i);
			continue;
		}
		if (ch === "\\") {
			let j = i + 1;
			while (j < n && /[A-Za-z-]/.test(markupInner[j])) j++;
			i = j;
			continue;
		}
		let j = i;
		while (j < n && !/[\s{}"#\\]/.test(markupInner[j])) j++;
		tokens.push(markupInner.slice(i, j));
		i = j;
	}
	return tokens.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Parses the value starting at `body[start]` (right after a field's `=`).
 * Supports a plain quoted string, or a `\markup { ... }` expression (braced
 * form only — an unbraced `\markup \command "text"` value has no reliable end
 * delimiter without a real LilyPond grammar, so it's left unsupported).
 * Returns `null` for unsupported/empty values (e.g. `##f`, `\markup` without
 * a brace), same as the field simply being absent.
 */
function parseFieldValue(
	body: string,
	start: number,
): { value: string; end: number } | null {
	if (body[start] === '"') {
		const end = matchQuotedStringEnd(body, start);
		if (end === -1) return null;
		const value = unescapeQuoted(body.slice(start + 1, end)).trim();
		return value ? { value, end: end + 1 } : null;
	}
	const MARKUP = "\\markup";
	if (
		body.startsWith(MARKUP, start) &&
		!/[A-Za-z-]/.test(body[start + MARKUP.length] ?? "")
	) {
		let i = start + MARKUP.length;
		while (/\s/.test(body[i])) i++;
		if (body[i] !== "{") return null;
		// body is itself a properly-nested brace sequence (see allHeaderBodies), so this `{` always has a matching `}`.
		const end = matchBalancedBraces(body, i);
		const value = extractMarkupText(body.slice(i + 1, end));
		return value ? { value, end: end + 1 } : null;
	}
	return null;
}

/** Extracts every `key = "..."` or `key = \markup { ... }` assignment from one `\header` block's body. Repeated keys within the same block keep the first occurrence. */
function fieldsFromHeaderBody(body: string): Record<string, string> {
	const fields: Record<string, string> = {};
	const identifierRe = /(?<![\w-])([a-zA-Z][\w-]*)\s*=\s*/g;
	let match: RegExpExecArray | null;
	// biome-ignore lint: reassigned in the while condition
	while ((match = identifierRe.exec(body))) {
		const key = match[1];
		const valueStart = match.index + match[0].length;
		const parsed = parseFieldValue(body, valueStart);
		if (!parsed) continue;
		if (!(key in fields)) fields[key] = parsed.value;
		identifierRe.lastIndex = parsed.end;
	}
	return fields;
}

/**
 * Extracts every string-valued header field found anywhere in `source`,
 * across every top-level `\header` block (there can be more than one — e.g.
 * book-level metadata plus a per-`\score` override). When the same field name
 * appears in more than one block, the **last occurrence in the file wins** —
 * approximating LilyPond's own inner-scope-overrides-outer-scope header chain
 * for the common case of a book/top-level header followed by per-score ones.
 */
export function parseLyHeaderFields(source: string): Record<string, string> {
	const withoutComments = stripComments(source);
	return Object.assign(
		{},
		...allHeaderBodies(withoutComments).map(fieldsFromHeaderBody),
	);
}

/** Extracts `title`/`composer` from the file's header block(s) (see `parseLyHeaderFields`); non-string values (e.g. an unbraced `\markup`, `##f`) are treated as absent. */
export function parseLyHeader(source: string): LyHeaderFields {
	const { title, composer } = parseLyHeaderFields(source);
	const fields: LyHeaderFields = {};
	if (title) fields.title = title;
	if (composer) fields.composer = composer;
	return fields;
}
