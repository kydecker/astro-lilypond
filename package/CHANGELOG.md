# astro-lilypond

## 0.1.0

### Minor Changes

- 49a0f61: Initial release! Render LilyPond music notation to inline SVG (or PNG) at build time in Astro sites.

  ## Prerequisites

  The [LilyPond](https://lilypond.org/download.html) binary must be installed and available on `PATH` at build time. The integration renders notation during the Astro build — the binary is not needed at runtime.

  ## Installation

  ```sh
  pnpm add astro-lilypond
  ```

  Add the integration to your `astro.config.mjs`:

  ```js
  import { defineConfig } from "astro/config";
  import lilypond from "astro-lilypond";

  export default defineConfig({
    integrations: [lilypond({ version: "2.24.0" })],
  });
  ```

  Then use fenced code blocks in your Markdown:

  ````md
  ```lilypond
  \score { \relative { c' d e f g } }
  ```
  ````

  See the [docs](https://lilypond.ky.fyi) for configuration options and live examples.
