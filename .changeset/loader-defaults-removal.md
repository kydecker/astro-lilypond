---
"astro-lilypond": major
---

Remove the `defaults` option from `lilypondLoader()`. It previously resolved independently of the integration's own `defaults`, so a `version` configured via `lilypond({ defaults })` was silently ignored by collection entries. `lilypondLoader()` now always uses the integration's `defaults`, matching `.ly` file imports and Markdown fences.
