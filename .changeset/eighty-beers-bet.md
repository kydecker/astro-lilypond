---
"astro-lilypond": minor
---

BREAKING: The integration has changed how `resolution` is set in order to mirror the API shape of LilyPond's command line tools.

Previously, resolution was set by passing an object with `type: "png"` to `format`:

```js
lilypond({
  format: {
    type: "png",
    resolution: 300
  }
})
```

Now, resolution is its own config entry, separate from `format`:

```js
lilypond({
  format: "png",
  resolution: 300
})
```

Note that `resolution` still only applies when format is set to `png`.
