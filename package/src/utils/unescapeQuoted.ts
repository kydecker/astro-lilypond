/** Undoes `\"` and `\\` escaping of a backslash-escaped quoted string value. */
export function unescapeQuoted(value: string): string {
	return value.replace(/\\(["\\])/g, "$1");
}
