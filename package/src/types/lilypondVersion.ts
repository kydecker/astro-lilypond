/**
 * A LilyPond version string, e.g. `"2.26.0"`.
 * Validates the `2.<minor>.<patch>` shape every LilyPond 2.x release uses.
 */
export type LilypondVersion = `2.${bigint}.${bigint}`;
