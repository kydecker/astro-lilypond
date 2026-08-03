---
"astro-lilypond": minor
---

Remove the `defaults` option from `lilypondLoader()`. The content loader now always uses the integration's own `defaults`, matching `.ly` file imports and Markdown fences.
