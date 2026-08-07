---
"astro-lilypond": minor
---

Adds an `includePaths` config option to extend `\include` resolution with extra directories, in addition to each score's own directory.

To enable, pass an array of directories to `includePaths` in the integration config:

```js
// astro.config.mjs
lilypond({
  includePaths: ["./src/snippets"],
})
```

This will ensure that LilyPond has access to any styles, layouts, and helper definitions which are defined separately from the score itself.
