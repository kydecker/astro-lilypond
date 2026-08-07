---
"astro-lilypond": minor
---

Adds `loading`, `decoding`, and `fetchpriority` props to `<Score />` (and to the `Score` returned from `getScore()`), forwarded onto every rendered `<img>` — including each page in a multi-page group.

These are the standard `<img>` fetch/decode hints. They're forwarded only when you pass them, so existing output is unchanged. The motivating use case is a list or gallery of many scores: mark off-screen scores `loading="lazy" decoding="async"` so they don't fetch until scrolled near, and mark an above-the-fold/LCP score `loading="eager" fetchpriority="high"` so the browser fetches it on the critical path.

```astro
---
import { Score } from "astro-lilypond";
import sonata from "./sonata.ly";
---

<Score
  content={sonata}
  loading="lazy"
  decoding="async"
/>
```