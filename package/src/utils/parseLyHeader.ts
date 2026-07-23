import { unescapeQuoted } from "./unescapeQuoted.js";

const HEADER_FIELDS = ["title", "composer"] as const;

export interface LyHeaderFields {
	title?: string;
	composer?: string;
}

/** Returns the body of the first `\header { ... }` block, matching braces by depth (ignoring braces inside quoted strings) so nested `\markup` braces or a literal `{`/`}` in a value can't truncate it early. */
function headerBodyOf(source: string): string | undefined {
	const match = /\\header\s*\{/.exec(source);
	if (!match) return undefined;

	const start = match.index + match[0].length;
	let depth = 1;
	let inString = false;
	for (let i = start; i < source.length; i++) {
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
			if (depth === 0) return source.slice(start, i);
		}
	}
	return undefined;
}

/** Extracts `title`/`composer` from the first `\header` block; non-string values (e.g. `\markup`) are treated as absent. */
export function parseLyHeader(source: string): LyHeaderFields {
	const body = headerBodyOf(source);
	if (!body) return {};

	const fields: LyHeaderFields = {};
	for (const field of HEADER_FIELDS) {
		const fieldMatch = new RegExp(
			`\\b${field}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"`,
		).exec(body);
		if (!fieldMatch) continue;
		const value = unescapeQuoted(fieldMatch[1]).trim();
		if (value) fields[field] = value;
	}
	return fields;
}
