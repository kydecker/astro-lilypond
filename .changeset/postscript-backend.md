---
"astro-lilypond": minor
---

Adds the ability to set the graphics backend to `"ps"` (postscript), in addition to `"cairo"` (default). This enables `\postscript` markup within LilyPond files to be successfully rendered.

```js
lilypond({
  defaults: {
    backend: "ps",
    format: "png",
  },
})
```

Note: the postscript backend cannot render to SVG, so when using it, `defaults.format` should be set to `"png"`.
