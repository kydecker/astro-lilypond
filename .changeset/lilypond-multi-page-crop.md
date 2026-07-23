---
"astro-lilypond": minor
---

**BREAKING**: `<LilyPond>` `.ly` imports no longer crop scores by default; they now render every page.

`defaults.crop` now accepts `true | false | "markdown-only"` (previously `boolean`) and defaults to `"markdown-only"` (previously `true`):

- `"markdown-only"` (new default): crop Markdown only; `<LilyPond>` imports render full, uncropped pages.
- `true` (old default): crop everywhere
- `false`: never crop.

A `.ly` import can also override the default per-instance by appending `?crop` or `?nocrop` to the import path.

To keep the old cropped-everywhere behavior:

```diff
 lilypond({
   defaults: {
+    crop: true,
   }
 })
```

If you don't use `<LilyPond>` component imports, or already set `defaults.crop` explicitly, no change is needed. Multi-page output renders as an `<ol>` ordered list of images.
