/** Returns true for the fenced-block language identifiers that trigger SVG rendering. */
export function isLilypondLang(lang: string | null | undefined): boolean {
	return lang === "lilypond" || lang === "ly" || lang === "ily";
}
