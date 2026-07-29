---
"astro-lilypond": minor
---

Add automatic LilyPond installation via a new `autoInstall` option (on by default). When no `lilypond` binary is found on `PATH`, a matching prebuilt release is downloaded and cached. A `lilypond` already on `PATH` is always used instead.

If you were manually installing `lilypond` in CI, that logic can be removed.

If you would prefer to continue managing manual installation of `lilypond`, set `autoInstall: false` in your integration config.
