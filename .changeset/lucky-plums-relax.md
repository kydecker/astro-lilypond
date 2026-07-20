---
"astro-lilypond": patch
---

Fixed rendered scores sometimes failing to load in `astro dev` after editing a `.ly` file or Markdown score, requiring a restart to recover. Dev-mode assets are now written to the same location as `astro build`, and edited scores no longer leave old versions behind in `publicDir`.
