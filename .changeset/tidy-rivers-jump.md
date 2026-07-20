---
"astro-lilypond": minor
---

Rendered scores are now written to image files and referenced by URL, instead of being embedded inline as base64 data. This enables a few things:

- Browser-native caching of image assets
- Faster rebuilds since unchanged scores can be skipped

Images are written to a new `outputDir` config option (which defaults to `_lilypond/`), output inside Astro's `publicDir` (which defaults to `public`). You can change the `outpurDir` via the config in the integration:

```js
// astro.config.mjs
lilypond({
  outputDir: "scores"
})
```

Compiled images are regenerated automatically and use content-addressable hashes, meaning that filenames will not change if the content has not changed. You can safely check generated files into your repository, if you want.

If you would prefer that generated scores not show up in your git repository or history, update `.gitignore`:

```ini
# ignore generated LilyPond scores
public/_lilypond
```

Comitting built scores will make rebuilds and startup faster since LilyPond does not have to rerun each time. Of course, it will increase the size of your repository. Be cautious if you are outputting `png` files with high `resolution`.
