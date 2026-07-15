---
"astro-lilypond": patch
---

Behavior change: loudly fail the build when attempting to process invalid LilyPond markup. Previously, the build would succeed, but an error message would be emitted to HTML, which could CI builds which pass but web pages which are broken on view. Prefer failing on error instead.
