# astro-lilypond

## 0.3.2

### Patch Changes

- 5bf0550: Automatically inject type definitions to allow importing `.ly`, `.ily`, and `.lilypond` files without manually editing `env.d.ts`.

## 0.3.1

### Patch Changes

- d229102: Support the `ily` extension for LilyPond files, in addition to the existing `lilypond` and `ly` markers.

## 0.3.0

### Minor Changes

- 143affa: Enable setting global and per-component 'crop' config.

  Set to `false` for full-page scores where tight cropping is undesirable:

  ```astro
  ---
  import LilyPond from 'astro-lilypond/component';
  import excerpt from './scores/excerpt.ly';
  import fullPage from './scores/full-page.ly';
  ---

  <LilyPond content={excerpt} />
  <LilyPond content={fullPage} crop={false} />
  ```

  Or change the default global crop:

  ```js
  // astro.config.mjs
  import { defineConfig } from "astro/config";
  import lilypond from "astro-lilypond";

  export default defineConfig({
    integrations: [
      lilypond({
        crop: false,
      }),
    ],
  });
  ```

## 0.2.0

### Minor Changes

- 32d06ea: Add a <LilyPond> component to allow rendering scores outside of Markdown.

  ```astro
  ---
  import LilyPond from 'astro-lilypond/component';
  import prelude from './scores/prelude.ly';
  ---

  <LilyPond content={prelude} />
  ```

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
