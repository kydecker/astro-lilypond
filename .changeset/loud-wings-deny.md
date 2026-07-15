---
"astro-lilypond": minor
---

Add a <LilyPond> component to allow rendering scores outside of Markdown.

Works with files:

```astro
---
import LilyPond from 'astro-lilypond/component';
import prelude from './scores/prelude.ly?raw';
---

<LilyPond content={prelude} />
```

Or inline content:

```astro
---
import LilyPond from 'astro-lilypond/component';
---

<LilyPond content={String.raw`
  \relative c' {
    \clef treble
    c4 d e f | g a b c |
  }
`} />
```
