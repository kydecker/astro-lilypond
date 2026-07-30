export const STANDARD_HEADER_FIELDS = [
	"arranger",
	"composer",
	"copyright",
	"dedication",
	"instrument",
	"meter",
	"opus",
	"piece",
	"poet",
	"subsubtitle",
	"subtitle",
	"tagline",
	"title",
] as const;

export type KnownLyHeaderFields = {
	[K in (typeof STANDARD_HEADER_FIELDS)[number]]?: string;
};

/** Header metadata extracted from a score's `\header` block(s). */
export interface LilypondMetadata extends KnownLyHeaderFields {
	[field: string]: string | undefined;
}

/** Tags a bag of parsed `\header` fields (see `parseLyHeaderFields`) as `LilypondMetadata`. */
export function toLilypondMetadata(
	fields: Record<string, string>,
): LilypondMetadata {
	return fields;
}
