---
"astro-lilypond": minor
---

Add `lilypondLoader()` for exposing a folder of `.ly` files as an [Astro content collection](https://docs.astro.build/en/guides/content-collections/), with `\header` metadata (`title`, `composer`, `opus`, etc.) parsed onto each entry.

```ts
// src/content.config.ts
import { defineCollection } from "astro:content";
import { lilypondLoader } from "astro-lilypond/loader";

export const collections = {
  scores: defineCollection({
    loader: lilypondLoader({ base: "./src/content/scores" }),
  }),
};
```

```astro
---
import { getCollection } from "astro:content";
import LilyPond from "astro-lilypond/component";

const scores = await getCollection("scores");
---

<ul>
  {scores.map((score) => (
    <li>
      <h3>{score.data.title}</h3>
      <LilyPond content={score.data} />
    </li>
  ))}
</ul>
```
