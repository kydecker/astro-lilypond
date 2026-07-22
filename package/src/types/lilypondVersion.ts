/**
 * A LilyPond version string, e.g. `"2.26.0"`.
 * Validates the `2.<minor>.<patch>` shape every LilyPond 2.x release uses.
 *
 * Uses the `${bigint}` placeholder (plain digit sequences) rather than
 * `${number}`, which would also accept decimals, exponents, and leading
 * zeros — e.g. `"2.1e1.0"` or `"2.3.14.15"` — as a valid version.
 */
export type LilypondVersion = `2.${bigint}.${bigint}`;
