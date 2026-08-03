---
"astro-lilypond": patch
---

Declare `engines.node: ">=22.12.0"`, matching the Astro 7 peer dependency's own requirement, so incompatible Node versions fail with a clear error at install time instead of a confusing one later.
