const HEADER_FIELDS = ["title", "composer"] as const;

export interface LyHeaderFields {
	title?: string;
	composer?: string;
}

/** Undoes the `\"` and `\\` escaping of a quoted LilyPond string value. */
function unescapeQuoted(value: string): string {
	return value.replace(/\\(["\\])/g, "$1");
}

/** Returns the body of the first `\header { ... }` block, matching braces by depth so a nested `\markup` block can't truncate it early. */
function headerBodyOf(source: string): string | undefined {
	const match = /\\header\s*\{/.exec(source);
	if (!match) return undefined;

	const start = match.index + match[0].length;
	let depth = 1;
	for (let i = start; i < source.length; i++) {
		if (source[i] === "{") depth++;
		else if (source[i] === "}") {
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
