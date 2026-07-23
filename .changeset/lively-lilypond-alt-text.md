---
"astro-lilypond": minor
---

Add alt text support for rendered LilyPond images.

- Alt text is automatically derived from `title`/`composer` fields in a score's `\header` block, composed as `"{title}, by {composer}"` (or just the title, or `"Sheet music by {composer}"`, or empty when neither is present).
- Override the automatically-derived alt text with `alt="..."` in a fenced code block's meta string (` ```lilypond alt="..." `), or the `<LilyPond>` component's new `alt` prop.
- Multi-page scores wrap their pages in an `<ol>`, so every page gets the same alt text, leaving it to screen readers already to announce list position on their own.
