---
title: LilyPond Syntax
description: A quick reference for LilyPond notation inside astro-lilypond code blocks.
---

You can use any valid LilyPond syntax with `astro-lilypond`. This page covers the most common patterns.

## Pitches and octave markers

Note names run from `a` to `g`. Inside `\relative`, each pitch is chosen to be as close as possible to the previous note — within a fourth above or below. Use `'` to raise by one octave and `,` to lower.

```lilypond
\relative c' {
  c4 d e f | g a b c |
  c' b a g | f e d c |
}
```

```lilypondtext
\relative c' {
  c4 d e f | g a b c |
  c' b a g | f e d c |
}
```

## Rhythms and durations

Notes inherit the previous note's duration by default. A new duration can be set by appending a number to the note:

| Syntax | Duration | Name |
|---|---|---|
| `1` | Whole | Semibreve |
| `2` | Half | Minim |
| `4` | Quarter | Crotchet |
| `8` | Eighth | Quaver |
| `16` | Sixteenth | Semiquaver |
| `32` | Thirty-second | Demisemiquaver |

```lilypond
\relative c' {
  c4 c8 c c16 c c c c32 c c c c c c c
}
```

```lilypondtext
\relative c' {
  c4 c8 c c16 c c c c32 c c c c c c c
}
```

Append dots to extend by half the note's value. Double-dotting adds three-quarters:

| Syntax | Duration |
|---|---|
| `c4.` | Dotted quarter |
| `c4..` | Double-dotted quarter |

```lilypond
\relative c' {
  c4. c8 c4 r |
  c2. c4 |
  c4.. c16 c2 |
}
```

```lilypondtext
\relative c' {
  c4. c8 c4 r |
  c2. c4 |
  c4.. c16 c2 |
}
```

## Rests

`r` is an ordinary rest, `R` is a full-measure rest displayed centred in the bar, and `s` reserves time without printing anything.

```lilypond
\relative c' {
  c4 r4 c4 r4 |
  r2 c2 |
  R1 |
}
```

```lilypondtext
\relative c' {
  c4 r4 c4 r4 |
  r2 c2 |
  R1 |
}
```

## Accidentals

Accidentals are written as `is` and `es` suffixes appended to the note name.

| Syntax | Meaning | Example |
|---|---|---|
| `is` | Sharp | `cis` = C♯ |
| `es` | Flat | `bes` = B♭ |
| `isis` | Double sharp | `cisis` = C𝄪 |
| `eses` | Double flat | `ceses` = C𝄫 |

```lilypond
\relative c' {
  c4 cis d dis | e f fis g |
  g4 ges f fes | e es d des |
}
```

```lilypondtext
\relative c' {
  c4 cis d dis | e f fis g |
  g4 ges f fes | e es d des |
}
```

## Key and time signatures

Set the key with `\key` and the time signature with `\time`. Both take effect from where they appear.

```lilypond
\relative c' {
  \key g \major
  \time 3/4
  g4 a b | c b a | g2. |
}
```

```lilypondtext
\relative c' {
  \key g \major
  \time 3/4
  g4 a b | c b a | g2. |
}
```

## Barlines

LilyPond inserts single barlines automatically. Use `\bar` to override:

| Syntax | Description |
|---|---|
| `\bar "\|\|"` | Double barline |
| `\bar "\|."` | Final barline |
| `\bar ".\|:"` | Start repeat |
| `\bar ":\|."` | End repeat |

```lilypond
\relative c' {
  c1 \bar "||"
  c1 \bar ".|:"
  c1 \bar ":|."
  c1 \bar "|."
}
```

```lilypondtext
\relative c' {
  c1 \bar "||"
  c1 \bar ".|:"
  c1 \bar ":|."
  c1 \bar "|."
}
```

## Chords

Write a chord by wrapping notes in angle brackets. All notes in the brackets share the same duration.

```lilypond
\relative c' {
  <c e g>4 <d f a> <e g b> <c e g> |
  <f a c>2 <g b d> |
}
```

```lilypondtext
\relative c' {
  <c e g>4 <d f a> <e g b> <c e g> |
  <f a c>2 <g b d> |
}
```

## Articulations

Attach articulations after the note with a dash and a symbol:

| Syntax | Shorthand | Name |
|---|---|---|
| `\staccato` | `-.` | Staccato |
| `\tenuto` | `--` | Tenuto |
| `\accent` | `->` | Accent |
| `\marcato` | `-^` | Marcato |
| `\staccatissimo` | `-!` | Staccatissimo |
| `\portato` | `-_` | Portato |

```lilypond
\relative c'' {
  c4-. c-- c-> c-^ |
  c4-! c-_ c2 |
}
```

```lilypondtext
\relative c'' {
  c4-. c-- c-> c-^ |
  c4-! c-_ c2 |
}
```

## Dynamics

| Syntax | Name |
|---|---|
| `\ppp` | Pianississimo |
| `\pp` | Pianissimo |
| `\p` | Piano |
| `\mp` | Mezzo-piano |
| `\mf` | Mezzo-forte |
| `\f` | Forte |
| `\ff` | Fortissimo |
| `\fff` | Fortississimo |
| `\sfz` | Sforzando |

Use `\<` to begin a crescendo hairpin and `\>` for a diminuendo; close either with `\!`.

```lilypond
\relative c'' {
  c4\pp c c c |
  c4\< c c c\! |
  c4\ff c\> c c\! |
  c4\mp c\mf c c |
}
```

```lilypondtext
\relative c'' {
  c4\pp c c c |
  c4\< c c c\! |
  c4\ff c\> c c\! |
  c4\mp c\mf c c |
}
```

## Slurs and ties

A slur spans from `(` to `)`. A tie connects two notes of the same pitch with `~`.

```lilypond
\relative c'' {
  c4( d e f) |
  g2~ g4 f |
  e4( f~ f2) |
}
```

```lilypondtext
\relative c'' {
  c4( d e f) |
  g2~ g4 f |
  e4( f~ f2) |
}
```

## Grace notes

`\grace` places a small unmetered note before the main note. Use braces for multiple grace notes.

```lilypond
\relative c'' {
  \grace e8 d4 c2. |
  \grace { d16 e } f4 e2. |
}
```

```lilypondtext
\relative c'' {
  \grace e8 d4 c2. |
  \grace { d16 e } f4 e2. |
}
```

## Tuplets

`\tuplet` groups notes into a ratio. The most common case is triplets (`\tuplet 3/2`), where three notes occupy the space of two.

```lilypond
\relative c'' {
  \tuplet 3/2 { c4 d e } f2 |
  \tuplet 3/2 { g8 f e } \tuplet 3/2 { d c b } c2 |
}
```

```lilypondtext
\relative c'' {
  \tuplet 3/2 { c4 d e } f2 |
  \tuplet 3/2 { g8 f e } \tuplet 3/2 { d c b } c2 |
}
```

## Multiple voices

Use `<<` and `>>` to stack voices on the same staff. `\voiceOne` and `\voiceTwo` set stem directions automatically. Separate voices with `\\`.

```lilypond
\new Staff <<
  \new Voice {
    \voiceOne
    \relative c'' { c4 b a g }
  }
  \new Voice {
    \voiceTwo
    \relative c' { e4 d c b }
  }
>>
```

```lilypondtext
\new Staff <<
  \new Voice {
    \voiceOne
    \relative c'' { c4 b a g }
  }
  \new Voice {
    \voiceTwo
    \relative c' { e4 d c b }
  }
>>
```

## Additional resources

LilyPond can have a bit of a steep learning curve, but these resources can help.

- [An introduction to LilyPond markup](https://lilypond.org/doc/v2.24/Documentation/web/text-input) is a handy single-page look at some of the basic syntax in LilyPond.
- [LilyPond Notation Reference](https://lilypond.org/doc/v2.24/Documentation/notation/) is the comprehensive manual on all notation possible in LilyPond.
  - [Notation Cheat Sheet](https://lilypond.org/doc/v2.24/Documentation/notation/cheat-sheet) is a quick reference for the most common notation.
