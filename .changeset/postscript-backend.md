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

Individual scores can also override the backend via `getScore()` or `<Score>`:

```astro
<Score content={myScore} format="png" backend="ps" />
```

Note: the postscript backend cannot render to SVG, so when using it, `format` should be set to `"png"`.
