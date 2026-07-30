/**
 * Builds the ambient module declarations injected for `.ly`-family imports,
 * so `import score from "./score.ly"` type-checks as a default-exported
 * `LilypondScore` — a lazy handle, not yet rendered to any format. Call the
 * exported `render()` function to produce actual output.
 */
export function lyTypeDeclarationsFor(extensions: readonly string[]): string {
	return extensions
		.map(
			(ext) =>
				`declare module "*${ext}" {\n  const score: import("astro-lilypond").LilypondScore;\n  export default score;\n}`,
		)
		.join("\n");
}
