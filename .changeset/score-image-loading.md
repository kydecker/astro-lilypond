---
"astro-lilypond": minor
---

Adds `loading`, `decoding`, `fetchpriority`, and `priority` to `<Score />` (and to the `Score` returned from `getScore()`), and the same `loading`/`decoding`/`fetchpriority`/`priority` hints to fenced ```lilypond blocks via the meta string. All four are forwarded onto every rendered `<img>` — including each page in a multi-page group.

These are the standard `<img>` fetch/decode hints, forwarded only when you pass them, so existing output is unchanged. `priority` is a convenience for an above-the-fold or LCP score: it sets `loading="eager"`, `decoding="sync"`, `fetchpriority="high"` — the same defaults Astro's `<Image>` derives from its own `priority` prop — with any of the three you pass explicitly taking precedence.

```astro
---
import { Score } from "astro-lilypond";
import sonata from "./sonata.ly";
---

<!-- an off-screen score in a long list -->
<Score content={sonata} loading="lazy" decoding="async" />

<!-- an above-the-fold / LCP score -->
<Score content={heroSonata} priority />
```

In a Markdown fence, set them as `key="value"` pairs alongside `alt="..."`:

~~~
```lilypond loading="lazy" decoding="async"
\score { c'4 d' e' f' }
```
~~~