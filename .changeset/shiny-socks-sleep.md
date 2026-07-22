---
"astro-lilypond": minor
---

**BREAKING**: The config options for `crop`, `resolution`, and `version` have been moved inside of a new `defaults` object in the config. This change is meant to help clarify and organize settings which apply by default to each score when rendered, but can be overridden by the score itself as-needed.

To upgrade, relocate `crop`, `resolution`, and `version` options inside of `defaults`:

```diff
// astro.config.mjs
export default defineConfig({
  integrations: [
    lilypond({
-     crop: true,
-     resolution: 300,
-     version: "2.26.0"   
+     defaults: {
+       crop: true,
+       resolution: 300,
+       version: "2.26.0"
+     }
    }),
  ],
});
```

If you have not configured `crop`, `resolution`, or `version` in your integration config, no change is needed.
