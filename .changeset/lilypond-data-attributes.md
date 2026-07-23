---
"astro-lilypond": minor
---

**BREAKING**: Rendered output no longer includes `class="lilypond"`. Images are now marked with a `data-lilypond-image` attribute.

To upgrade, update any CSS selectors targeting the old classes:

```diff
- .lilypond {
+ [data-lilypond-image] {
    background-color: white;
  }
```

In addition, you can now target multi-page groups with `data-lilypond-group`.
