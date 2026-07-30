export interface KnownLyHeaderFields {
	arranger?: string;
	composer?: string;
	copyright?: string;
	dedication?: string;
	instrument?: string;
	meter?: string;
	opus?: string;
	piece?: string;
	poet?: string;
	subsubtitle?: string;
	subtitle?: string;
	tagline?: string;
	title?: string;
}

/**
 * Header metadata extracted from a score's `\header` block(s). LilyPond's
 * standard fields are named above (`title`, `composer`, etc.); anything else
 * the file declares (e.g. `mutopiacomposer`) sits alongside them on the same
 * object, keyed by its own field name, rather than under a separate nested
 * bag — so the shape is identical whether it came from a plain `.ly` import
 * or a `lilypondLoader()` collection entry.
 */
export interface LilypondMetadata extends KnownLyHeaderFields {
	[field: string]: string | undefined;
}

/** Tags a bag of parsed `\header` fields (see `parseLyHeaderFields`) as `LilypondMetadata`. */
export function toLilypondMetadata(
	fields: Record<string, string>,
): LilypondMetadata {
	return fields;
}
