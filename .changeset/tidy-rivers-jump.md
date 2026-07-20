---
"astro-lilypond": minor
---

Rendered scores are now written to image files and referenced by URL, instead of being embedded inline as base64 data. This enables a few things:

- Browser-native caching of image assets
- Faster rebuilds since unchanged scores can be skipped

Images are written to a new `outputDir` option, which defaults to `_lilypond/` inside your `public/` directory:

```js
lilypond({
  outputDir: "scores"
})
```

This directory is regenerated automatically. If you would prefer that generated scores not show up in your git repository or history, update `.gitignore`:

```ini
# ignore generated LilyPond scores
public/_lilypond
```

Otherwise, you can safely commit the generated images and the hash will remain the same if the original score does not change. This will make rebuilds and startup faster since LilyPond does not have to rerun each time.
