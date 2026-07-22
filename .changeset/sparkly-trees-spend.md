---
"astro-lilypond": minor
---

**BREAKING**: The value of `version` is now `undefined` by default. To restore the previous behavior, update your config to set `defaults.version` to `"2.26.0"`:

```diff
// astro.config.mjs
export default defineConfig({
  integrations: [
    lilypond({
+     defaults: {
+       version: "2.26.0"
+     }
    }),
  ],
});
```

If you leave `version` undefined, every LilyPond example _must_ contain a version declaration:

```lilypond
\version "2.26.0"
```
