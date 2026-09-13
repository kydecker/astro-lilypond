---
"astro-lilypond": minor
---

`<Score />` now accepts `loading`, `decoding`, and `fetchpriority` attributes and passes them to every `<img>`.

```astro
<!-- High-priority loading, e.g. above the fold -->
<Score content={sonata} loading="eager" decoding="sync" fetchpriority="high" />

<!-- Low-priority loading, e.g. off-screen -->
<Score content={sonata} loading="lazy" decoding="async" />
```
