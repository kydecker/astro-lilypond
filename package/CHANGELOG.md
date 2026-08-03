# astro-lilypond

## 0.16.2

### Patch Changes

- 29e1ffc: Removes the rehype plugin. The `unified` Markdown processor always registers and uses `remark` first, so there should not be any user-facing impact from this.
- 29e1ffc: Fixes an issue where fenced LilyPond code blocks inside `.mdx` would render as text instead of images.

## 0.16.1

### Patch Changes

- f477f5b: Content collections from `lilypondLoader()` will now return correct TypeScript types for `entry.data` instead of returning data as `any`.

## 0.16.0

### Minor Changes

- 8717c58: Add a `<Score>` component for the common case of just displaying a score, without needing to call `render()` from frontmatter:

  ```astro
  ---
  import { Score } from "astro-lilypond";
  import bachInvention from "./bach-invention.ly";
  ---

  <Score content={bachInvention} />
  ```

  If you're only using `render()` to get a `Score` to display (not `pageCount`, `meta`, `raw`, or `pdf`), you can drop the frontmatter call entirely:

  ```diff
    ---
  - import { render } from "astro-lilypond";
  + import { Score } from "astro-lilypond";
    import bachInvention from "./bach-invention.ly";

  - const { Score } = await render(bachInvention, { crop: true });
    ---

  - <Score />
  + <Score content={bachInvention} crop />
  ```

  `render()` itself is unchanged and still the way to get `pageCount`, `meta`, `raw`, or a `pdf` link alongside the image.

  This also plays a similar role to the pre-v0.15 `<LilyPond>` component: both take your imported `.ly` file directly via a `content` prop, and both accept `pageLimit`, `class`, `style`, and `alt` props. `<Score>` additionally accepts `format` and `crop`, which previously required `render()`'s options:

  ```diff
    ---
  - import LilyPond from "astro-lilypond/component";
  + import { Score } from "astro-lilypond";
    import bachInvention from "./bach-invention.ly";
    ---

  - <LilyPond content={bachInvention} />
  + <Score content={bachInvention} />
  ```

### Patch Changes

- 56c96c3: Removes the `defaults.crop` config setting. All Markdown blocks are now cropped by default. Components can customize cropping per-instance.

## 0.15.0

### Minor Changes

- f81346d: **BREAKING:** Scores are now parsed using a `render()` function instead of being passed directly to a `<LilyPond>` component. If you were previously importing `.ly` files and passing them to the `<LilyPond>` component, update your code to instead pass the `.ly` file to a `render()` function inside of the frontmatter of an `.astro` file:

  ```diff
  ---
  - import LilyPond from "astro-lilypond/component";
  + import { render } from "astro-lilypond";
  import bachInvention from "./bach-invention.ly";

  + const { Score } = await render(bachInvention);
  ---

  - <LilyPond content={bachInvention} />
  + <Score />
  ```

  The `render()` function takes your `.ly` file and returns a `Score` component which you can render on the page.

  If you were using the `?crop` or `?nocrop` query params in imports, those are now exposed as config options inside `render()`:

  ```diff
  ---
  import { render } from "astro-lilypond";
  - import bachInvention from "./bach-invention.ly?crop";
  + import bachInvention from "./bach-invention.ly";

  + const { Score } = await render(bachInvention, { crop: true });
  ---

  - <LilyPond content={bachInvention} />
  + <Score />
  ```

  **BREAKING:** `lilypondLoader()` collection entries no longer spread `\header` fields (`title`, `composer`, `opus`, etc.) directly onto `entry.data`. They now live under `entry.data.meta`:

  ```diff
  - <h3>{entry.data.title}</h3>
  + <h3>{entry.data.meta.title}</h3>
  ```

  Additionally, you can now return `pdf` files from scores which can be exposed as download links. Set `{ pdf: true }` in the `render()` config, then use `pdf.src` from the result:

  ```astro
  ---
  import { render } from "astro-lilypond";
  import bachInvention from "./bach-invention.ly";

  const { Score, pdf } = await render(bachInvention, { pdf: true });
  ---

  <Score />
  <a href={pdf.src} download>Download PDF</a>
  ```

  `render()` also returns `pageCount` and `raw` (the exact LilyPond source text).

  A new `renderAll()` function renders many scores at once; this is helpful for `getCollection()` results.

  `<Score>` accepts the same props as `<LilyPond>` did: `pageLimit`, `class`, `style`, and `alt` props. Once you've set up your `render` function, you should be able to swap out `<LilyPond content={...} />` for `<Score />`.

## 0.14.0

### Minor Changes

- 1ebc784: Add automatic LilyPond installation via a new `autoInstall` option (on by default). When no `lilypond` binary is found on `PATH`, a matching prebuilt release is downloaded and cached. A `lilypond` already on `PATH` is always used instead.

  If you were manually installing `lilypond` in CI, that logic can be removed.

  If you would prefer to continue managing manual installation of `lilypond`, set `autoInstall: false` in your integration config.

## 0.13.0

### Minor Changes

- 38239ad: **BREAKING:** The `outputDir` option has been removed from both `lilypond()` and `lilypondLoader()`. `astro-lilypond` now relies on [`astro-emit-asset`](https://github.com/delucis/astro-emit-asset) for asset hashing, writing, and pruning. Rendered scores are now cached and served through Astro's own asset pipeline instead of being written to a directory under `publicDir`.

  If you had previously set `outputDir` in your integration config or collection loader, remove it.

  Likewise, if you had previously configured `.gitattributes` or `.gitignore` to ignore the `_lilypond` directory, that config can be safely removed.

  If you were committing files in `outputDir` (e.g. `public/_lilypond`) to your repo, you can delete that directory.

## 0.12.0

### Minor Changes

- 716fd79: Add a `pageLimit` prop to `<LilyPond>` to limit rendering to the first `n` pages of a multi-page score.

## 0.11.1

### Patch Changes

- 8532a52: Remove source maps from the published package, fixing Vite's "missing source file" warning.

## 0.11.0

### Minor Changes

- 977dd46: Add `lilypondLoader()` for exposing a folder of `.ly` files as an [Astro content collection](https://docs.astro.build/en/guides/content-collections/), with `\header` metadata (`title`, `composer`, `opus`, etc.) parsed onto each entry.

  ```ts
  // src/content.config.ts
  import { defineCollection } from "astro:content";
  import { lilypondLoader } from "astro-lilypond/loader";

  export const collections = {
    scores: defineCollection({
      loader: lilypondLoader({ base: "./src/content/scores" }),
    }),
  };
  ```

  ```astro
  ---
  import { getCollection } from "astro:content";
  import LilyPond from "astro-lilypond/component";

  const scores = await getCollection("scores");
  ---

  <ul>
    {scores.map((score) => (
      <li>
        <h3>{score.data.title}</h3>
        <LilyPond content={score.data} />
      </li>
    ))}
  </ul>
  ```

## 0.10.1

### Patch Changes

- b319aa6: Fix `Cannot find module` TypeScript errors on `.ly`/`.lilypond`/`.ily` imports using the `?crop` or `?nocrop` query suffix.

## 0.10.0

### Minor Changes

- e859c9e: **BREAKING:** Add a new `config` option for `defaults.cropScale`. which allows modifying the rendered dimensions of cropped `<img>` tags to compensate for the fact that LilyPond renders size units in points/mm, which, when translated to pixels, can appear too small. `cropScale` is set to `1.5` by default. As a consequence, this version will render cropped images larger than before.

  To maintain the previous sizing of cropped images, update your integration config:

  ```diff
  // astro.config.mjs
  import { defineConfig } from 'astro/config';
  import lilypond from 'astro-lilypond';

  export default defineConfig({
  -  integrations: [lilypond()]
  +  integrations: [lilypond({ defaults: { cropScale: 1 } })]
  });
  ```

### Patch Changes

- e859c9e: Output `width` and `height` attributes on all `<img>` tags to prevent layout shift.

## 0.9.0

### Minor Changes

- a44072d: Add alt text support for rendered LilyPond images.

  - Alt text is automatically derived from `title`/`composer` fields in a score's `\header` block, composed as `"{title}, by {composer}"` (or just the title, or `"Sheet music by {composer}"`, or empty when neither is present).
  - Override the automatically-derived alt text with `alt="..."` in a fenced code block's meta string (` ```lilypond alt="..." `), or the `<LilyPond>` component's new `alt` prop.
  - Multi-page scores wrap their pages in an `<ol>`, so every page gets the same alt text, leaving it to screen readers already to announce list position on their own.

## 0.8.0

### Minor Changes

- 881c621: **BREAKING**: Rendered output no longer includes `class="lilypond"`. Images are now marked with a `data-lilypond-image` attribute.

  To upgrade, update any CSS selectors targeting the old classes:

  ```diff
  - .lilypond {
  + [data-lilypond-image] {
      background-color: white;
    }
  ```

  In addition, you can now target multi-page groups with `data-lilypond-group`.

- 881c621: **BREAKING**: `<LilyPond>` `.ly` imports no longer crop scores by default; they now render every page.

  `defaults.crop` now accepts `true | false | "markdown-only"` (previously `boolean`) and defaults to `"markdown-only"` (previously `true`):

  - `"markdown-only"` (new default): crop Markdown only; `<LilyPond>` imports render full, uncropped pages.
  - `true` (old default): crop everywhere
  - `false`: never crop.

  A `.ly` import can also override the default per-instance by appending `?crop` or `?nocrop` to the import path.

  To keep the old cropped-everywhere behavior:

  ```diff
   lilypond({
     defaults: {
  +    crop: true,
     }
   })
  ```

  If you don't use `<LilyPond>` component imports, or already set `defaults.crop` explicitly, no change is needed. Multi-page output renders as an `<ol>` ordered list of images.

## 0.7.0

### Minor Changes

- 73dad83: **BREAKING**: The config options for `crop`, `resolution`, and `version` have been moved inside of a new `defaults` object in the config. This change is meant to help clarify and organize settings which apply by default to each score when rendered, but can be overridden by the score itself as-needed.

  To upgrade, relocate `crop`, `resolution`, and `version` options inside of `defaults`:

  ```diff
  // astro.config.mjs
  export default defineConfig({
    integrations: [
      lilypond({
  -     crop: true,
  -     resolution: 300,
  -     version: "2.26.0"
  +     defaults: {
  +       crop: true,
  +       resolution: 300,
  +       version: "2.26.0"
  +     }
      }),
    ],
  });
  ```

  If you have not configured `crop`, `resolution`, or `version` in your integration config, no change is needed.

## 0.6.0

### Minor Changes

- 12fdbfd: Rendered scores are now written to image files and referenced by URL, instead of being embedded inline as base64 data. This enables a few things:

  - Browser-native caching of image assets
  - Faster rebuilds since unchanged scores can be skipped

  Images are written to a new `outputDir` config option (which defaults to `_lilypond/`), output inside Astro's `publicDir` (which defaults to `public`). You can change the `outpurDir` via the config in the integration:

  ```js
  // astro.config.mjs
  lilypond({
    outputDir: "scores",
  });
  ```

  Compiled images are regenerated automatically and use content-addressable hashes, meaning that filenames will not change if the content has not changed. You can safely commit generated files to your repository, if you want.

  Comitting generated files will make rebuilds and startup faster, since LilyPond does not have to regenerate files from scratch. However, it will increase the size of your repository, which can pose issues if you have many scores, or if you use use `png` output with high `resolution`.

  If you would prefer that generated scores not show up in your git repository or history, update `.gitignore`:

  ```ini
  # ignore generated LilyPond scores
  public/_lilypond
  ```

### Patch Changes

- a69c23b: Fixed rendered scores sometimes failing to load in `astro dev` after editing a `.ly` file or Markdown score, requiring a restart to recover. Dev-mode assets are now written to the same location as `astro build`, and edited scores no longer leave old versions behind in `publicDir`.

## 0.5.2

### Patch Changes

- 69c9e30: `lilypond` invocations now time out after 60 seconds instead of potentially stalling the build indefinitely.

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

  #### Prerequisites

  The [LilyPond](https://lilypond.org/download.html) binary must be installed and available on `PATH` at build time. The integration renders notation during the Astro build — the binary is not needed at runtime.

  #### Installation

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
