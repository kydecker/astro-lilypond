---
title: Styling
description: Style LilyPond SVG output using the .lilypond CSS class.
---

By default, LilyPond SVGs use `currentColor`, which means they will inherit the color of the surrounding text:

```lilypond
\relative c' {
  \clef treble
  c4 d e f | g a b c |
}
```
