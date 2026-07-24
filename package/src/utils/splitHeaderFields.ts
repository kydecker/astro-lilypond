/**
 * LilyPond's standard `\header` field names
 */
export const STANDARD_HEADER_FIELDS = [
	"dedication",
	"title",
	"subtitle",
	"subsubtitle",
	"instrument",
	"poet",
	"composer",
	"meter",
	"arranger",
	"piece",
	"opus",
	"copyright",
	"tagline",
] as const;

export interface KnownLyHeaderFields {
	dedication?: string;
	title?: string;
	subtitle?: string;
	subsubtitle?: string;
	instrument?: string;
	poet?: string;
	composer?: string;
	meter?: string;
	arranger?: string;
	piece?: string;
	opus?: string;
	copyright?: string;
	tagline?: string;
}

/** Splits parsed header fields into LilyPond's standard named fields and everything else (e.g. `mutopiacomposer`, `maintainerEmail`). */
export function splitHeaderFields(
	fields: Record<string, string>,
): KnownLyHeaderFields & { extra: Record<string, string> } {
	const known: Record<string, string> = {};
	const extra: Record<string, string> = {};
	for (const [key, value] of Object.entries(fields)) {
		if ((STANDARD_HEADER_FIELDS as readonly string[]).includes(key)) {
			known[key] = value;
		} else {
			extra[key] = value;
		}
	}
	return { ...known, extra };
}
