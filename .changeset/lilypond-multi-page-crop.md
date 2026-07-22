---
"astro-lilypond": minor
---

**BREAKING**: `<LilyPond>` `.ly` imports now support multi-page output, and no longer crop all scores by default.

Previously, every score rendered by `astro-lilypond` was cropped to a single, tightly-bounded image by default. Now:

- `<LilyPond>` `.ly` imports render every page of the score, wrapped in an `<ol class="lilypond-pages">` with one `<li><img></li>` per page, instead of being forced into a single cropped image.
- Markdown fences are unaffected and still crop by default.
- A `.ly` import can opt back into a single cropped image with `?crop`, or force full, uncropped pages with `?nocrop`.

This is controlled by `defaults.crop`, which now accepts `true | false | "markdown-only"` (previously just `boolean`) and defaults to `"markdown-only"` (previously `true`):

- `"markdown-only"` (new default): crop Markdown fences; leave `<LilyPond>` imports as full pages.
- `true`: crop everywhere (old default)
- `false`: never crop by default.

To upgrade:

- If you rely on `<LilyPond>` component imports rendering as a single cropped image, either set `defaults.crop: true` in your integration config, or append `?crop` to the affected `.ly` imports.
- If your styling assumes `<LilyPond>` always renders a single `<img>`, add styles for the new `<ol class="lilypond-pages">` wrapper, or force cropping as above to keep the old single-`<img>` markup.
- If you don't use `<LilyPond>` component imports, or already configure `defaults.crop` explicitly, no change is needed.

```diff
// astro.config.mjs
export default defineConfig({
  integrations: [
    lilypond({
      defaults: {
+       crop: true, // keep the previous cropped-everywhere behavior
      }
    }),
  ],
});
```
