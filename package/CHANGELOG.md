# astro-lilypond

## 0.5.1

### Patch Changes

- efae0f7: Remove unnecessary invocation queue from render pipeline

## 0.5.0

### Minor Changes

- 3853860: Update rendering to use `<img>` tags for all content, including `.svg`. Previously, svg scores were inlined in the page. However, the `cairo`-based backend renderer makes heavy use of SVG's `<use>` element. When inlined on the page, these `<use>` tags can conflict with one another across scores, corrupting the display of notation. To avoid this, SVG elements are now rendered within an `<img>` tag. This has the benefit of reducing the number of HTML nodes on the page, but the drawback of no longer being able to inherit `currentColor` for noteheads. Given that the desire for inverted staff paper is unusual (and for many people, likely undesirable), this feels like an acceptable tradeoff.

  To prevent scores from displaying as black-on-black when in dark mode, add global styles to `.lilypond`:

  ```css
  .lilypond {
    background-color: white;
  }
  ```

### Patch Changes

- 8194832: Emit source names to build log when available for easier debugging

## 0.4.0

### Minor Changes

- 96fa319: BREAKING: The integration has changed how `resolution` is set in order to mirror the API shape of LilyPond's command line tools.

  Previously, resolution was set by passing an object with `type: "png"` to `format`:

  ```js
  lilypond({
    format: {
      type: "png",
      resolution: 300,
    },
  });
  ```

  Now, resolution is its own config entry, separate from `format`:

  ```js
  lilypond({
    format: "png",
    resolution: 300,
  });
  ```

  Note that `resolution` still only applies when format is set to `png`.

### Patch Changes

- 96fa319: Allow LilyPond to emit text during builds for better insight into warnings and errors from `.ly` compilation.
- 96fa319: Use LilyPond's `cairo` backend renderer instead of the default `ps` renderer. From LilyPond v2.26.0's [major changes](https://lilypond.org/doc/v2.26/Documentation/changes/major-changes-in-lilypond):

  > Instead of generating PostScript or SVG output by itself, LilyPond can now use the Cairo library to produce its output. This is referred to as the ‘Cairo backend’, and can be turned on using the -dbackend=cairo command-line option. This works for all output formats (PDF, SVG, PNG, PostScript), and brings speed and rendering fidelity improvements in SVG output in particular. However, keep in mind that this backend does not yet implement all features of the default backends. Among the features not currently supported are PDF outlines, the -dembed-source-code option for PDF, and the output-attributes property for SVG.

## 0.3.4

### Patch Changes

- 2b708bc: Support `\include` in LilyPond files to allow importing and reusing snippets from other files:

  ```ly
  \version "2.25.28"
  \include "example-header.ily"
  ```

  Add an [examples](https://lilypond.ky.fyi/examples) page to the docs which mirrors the content from https://lilypond.org/examples.html.

## 0.3.3

### Patch Changes

- ce95ae1: Behavior change: loudly fail the build when attempting to process invalid LilyPond markup. Previously, the build would succeed, but an error message would be emitted to HTML, which could CI builds which pass but web pages which are broken on view. Prefer failing on error instead.
- ce95ae1: Fix a broken import from src/utils that was causing <LilyPond> component imports to fail.

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
