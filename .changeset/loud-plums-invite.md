---
"astro-lilypond": patch
---

Removes the rehype plugin. The `unified` Markdown processor always registers and uses `remark` first, so there should not be any user-facing impact from this.
