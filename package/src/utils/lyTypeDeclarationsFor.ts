/**
 * Builds the ambient module declarations injected for `.ly`-family imports,
 * so `import content from "./score.ly"` (and its `?crop`/`?nocrop` query
 * variants) type-check as a default-exported `LilypondContent`.
 */
export function lyTypeDeclarationsFor(
	extensions: readonly string[],
	queryParams: readonly string[],
): string {
	const suffixes = ["", ...queryParams.map((param) => `?${param}`)];

	return extensions
		.flatMap((ext) =>
			suffixes.map(
				(suffix) =>
					`declare module "*${ext}${suffix}" {\n  const content: import("astro-lilypond").LilypondContent;\n  export default content;\n}`,
			),
		)
		.join("\n");
}
