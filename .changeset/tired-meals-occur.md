---
"astro-lilypond": major
---

**Announcing Astro Lilypond 1.0!**

The `astro-lilypond` package is now stable. Use it to help write and render music notation on your Astro site.

To install it in an existing Astro project:

```sh
pnpm astro add astro-lilypond
```

Or follow the [getting started](https://lilypond.ky.fyi/getting-started) guide.

Features:

- Render text to music notation via [Markdown](https://lilypond.ky.fyi/guides/markdown) or with an Astro [component](https://lilypond.ky.fyi/guides/component).
- Works with `remark` and `satteri` Markdown processors out-of-the-box.
- Generates automatic alt text from the score's title and composer. (Or supply your own.)
- Includes a `lilypondLoader()` for creating an Astro [content collection](https://lilypond.ky.fyi/guides/collections) from a folder of `.ly` files. Automatically extracts metadata.
- Works with all LilyPond syntax. Check out the [examples](https://lilypond.ky.fyi/examples) to see what's possible!
- 100% unit test coverage and full end-to-end tests.

View all docs at [lilypond.ky.fyi](https://lilypond.ky.fyi).

---

**BREAKING**:

- `render()` has been renamed to `getScore()`, and its types `RenderOptions`/`RenderResult` to `GetScoreOptions`/`GetScoreResult`. To update, replace `render` imports with `getScore`:

  ```diff
    ---
  - import { render } from "astro-lilypond";
  + import { getScore } from "astro-lilypond";
    import bachInvention from "./bach-invention.ly";

  - const { Score, meta, raw, pdf } = await render(bachInvention);
  + const { Score, meta, raw, pdf } = await getScore(bachInvention);
    ---
  ```

- `renderAll()` has been removed. Use `Promise.all` with `getScore` instead:

  ```diff
    ---
    import { getCollection } from "astro:content";
  - import { renderAll } from "astro-lilypond";
  + import { getScore } from "astro-lilypond";

    const scores = await getCollection("scores");
  - const rendered = await renderAll(scores.map((s) => s.data));
  + const rendered = await Promise.all(scores.map((s) => getScore(s.data)));
    ---
  ```

- `pageCount: number` is replaced by `pages: LilypondPage[]` on `getScore()`'s result. Use `pages.length` for a count:

  ```diff
    ---
  - const { Score, pageCount } = await render(bachInvention);
  + const { Score, pages } = await getScore(bachInvention);
    ---

  - <p>{pageCount} pages</p>
  + <p>{pages.length} pages</p>
  ```

  The new `pages` object contains `src`/`width`/`height` and can be used to build your own markup instead of using the built-in `Score` component:

  ```astro
  ---
  const { pages } = await getScore(bachInvention);
  ---

  <div class="gallery">
    {pages.map((page) => <img src={page.src} width={page.width} height={page.height} />)}
  </div>
  ```

- The `format` config has been relocated beneath `defaults`:

  ```diff
    lilypond({
  -   format: "png",
  +   defaults: {
  +     format: "png",
  +   },
    })
  ```
