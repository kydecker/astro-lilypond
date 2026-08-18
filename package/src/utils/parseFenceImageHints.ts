const LOADING_VALUES = ["lazy", "eager"] as const;
const DECODING_VALUES = ["async", "sync", "auto"] as const;
const FETCHPRIORITY_VALUES = ["high", "low", "auto"] as const;

// Each pattern requires the key to sit at the start of the meta or after
// whitespace, so `data-loading="…"` and the `priority` tail of
// `fetchpriority="…"` can't match. Mirrors parseFenceMeta's `alt` guard.
const LOADING_PATTERN = /(?:^|\s)loading="([^"]*)"/;
const DECODING_PATTERN = /(?:^|\s)decoding="([^"]*)"/;
const FETCHPRIORITY_PATTERN = /(?:^|\s)fetchpriority="([^"]*)"/;
const PRIORITY_PATTERN = /(?:^|\s)priority="([^"]*)"/;

type LoadingValue = (typeof LOADING_VALUES)[number];
type DecodingValue = (typeof DECODING_VALUES)[number];
type FetchpriorityValue = (typeof FETCHPRIORITY_VALUES)[number];

export interface FenceImageHints {
	loading?: LoadingValue;
	decoding?: DecodingValue;
	fetchpriority?: FetchpriorityValue;
	priority?: boolean;
}

/** Returns the match if it's one of `allowed`, else `undefined`. */
function oneOf<T extends string>(
	match: string | undefined,
	allowed: readonly T[],
): T | undefined {
	if (match === undefined) return undefined;
	return allowed.includes(match as T) ? (match as T) : undefined;
}

/**
 * Reads the image-loading hints (`loading`, `decoding`, `fetchpriority`,
 * `priority`) a fenced ```lilypond block's meta string (alongside
 * `alt="…"`), e.g. ```lilypond alt="Sonata" loading="lazy" decoding="async"`.
 * Unrecognised or invalid values are dropped, so a typo degrades to the
 * default rather than forwarding a bad attribute onto the `<img>`.
 */
export function parseFenceImageHints(
	meta: string | null | undefined,
): FenceImageHints {
	if (!meta) return {};

	const hints: FenceImageHints = {};

	const loading = oneOf(LOADING_PATTERN.exec(meta)?.[1], LOADING_VALUES);
	if (loading) hints.loading = loading;

	const decoding = oneOf(DECODING_PATTERN.exec(meta)?.[1], DECODING_VALUES);
	if (decoding) hints.decoding = decoding;

	const fetchpriority = oneOf(
		FETCHPRIORITY_PATTERN.exec(meta)?.[1],
		FETCHPRIORITY_VALUES,
	);
	if (fetchpriority) hints.fetchpriority = fetchpriority;

	const priorityRaw = PRIORITY_PATTERN.exec(meta)?.[1];
	if (priorityRaw === "true" || priorityRaw === "false") {
		hints.priority = priorityRaw === "true";
	}

	return hints;
}
