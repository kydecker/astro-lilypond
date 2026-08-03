---
"astro-lilypond": minor
---

LilyPond syntax errors now render an inline error during `astro dev` instead of crashing the page. The inline message includes logging from LilyPond indicating where the syntax error was detected.

`astro build` is unaffected, and will still fail loudly if LilyPond syntax errors are present.
