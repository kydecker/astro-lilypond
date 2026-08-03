---
"astro-lilypond": minor
---

Syntax errors in LilyPond code now render an inline error message during `astro dev` instead of crashing the entire page. The message includes logging from LilyPond indicating where the syntax error was detected.

`astro build` is unaffected, and will still fail loudly if LilyPond syntax errors are present.
