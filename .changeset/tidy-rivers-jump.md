---
"astro-lilypond": minor
---

Rendered scores are now written to image files and referenced by URL, instead of being embedded inline as base64 data. This means smaller pages, images the browser can cache across visits, and faster rebuilds since unchanged scores don't need to be re-rendered.

Images are written to a new `outputDir` option, which defaults to `_lilypond/` inside your `public/` directory:

```js
lilypond({
  outputDir: "scores"
})
```

This directory is regenerated automatically, so add it to your `.gitignore` (e.g. `public/_lilypond/`) rather than committing it.
