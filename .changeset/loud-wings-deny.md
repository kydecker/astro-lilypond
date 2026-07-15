---
"astro-lilypond": minor
---

Add a <LilyPond> component to allow rendering scores outside of Markdown.

```astro
---
import LilyPond from 'astro-lilypond/component';
import prelude from './scores/prelude.ly';
---

<LilyPond content={prelude} />
```
