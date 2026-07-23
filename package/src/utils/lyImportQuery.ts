/** Query params `lyFilePlugin` recognizes as its own on a `.ly`-family import. */
export const RECOGNIZED_QUERY_PARAMS = ["crop", "nocrop"] as const;

const RECOGNIZED_PARAMS = new Set<string>(RECOGNIZED_QUERY_PARAMS);

export interface LyImportQuery {
	/** The import's module id with any query string stripped. */
	pathname: string;

	/**
	 * The crop override the import's query string requests, if any:
	 * `true` for `?crop`, `false` for `?nocrop`, `undefined` if neither is
	 * present (the caller's own default applies).
	 */
	cropOverride: boolean | undefined;
}

/**
 * Parses a Vite module id for a `.ly`/`.lilypond`/`.ily` import into its
 * pathname and this plugin's `?crop`/`?nocrop` override.
 *
 * Returns `undefined` when the id carries a query param this plugin
 * doesn't own (e.g. Vite's built-in `?raw`, `?url`) — such imports aren't
 * ours to render, and the caller should let them fall through to whichever
 * plugin does own them.
 */
export function parseLyImportQuery(id: string): LyImportQuery | undefined {
	const queryIndex = id.indexOf("?");
	const pathname = queryIndex === -1 ? id : id.slice(0, queryIndex);
	const params = new URLSearchParams(
		queryIndex === -1 ? "" : id.slice(queryIndex + 1),
	);

	if ([...params.keys()].some((key) => !RECOGNIZED_PARAMS.has(key))) {
		return undefined;
	}

	const cropOverride = params.has("crop")
		? true
		: params.has("nocrop")
			? false
			: undefined;

	return { pathname, cropOverride };
}
