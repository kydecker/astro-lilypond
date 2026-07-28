---
"astro-lilypond": minor
---

**BREAKING:** The `outputDir` option has been removed from both `lilypond()` and `lilypondLoader()`. `astro-lilypond` now relies on [`astro-emit-asset`](https://github.com/delucis/astro-emit-asset) for asset hashing, writing, and pruning. Rendered scores are now cached and served through Astro's own asset pipeline instead of being written to a directory under `publicDir`.

If you had previously set `outputDir` in your integration config or collection loader, remove it.

Likewise, if you had previously configured `.gitattributes` or `.gitignore` to ignore the `_lilypond` directory, that config can be safely removed.
