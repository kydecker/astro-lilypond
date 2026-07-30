---
"astro-lilypond": minor
---

**BREAKING:** Scores are now parsed using a `render()` function instead of being passed directly to a `<LilyPond>` component. If you were previously importing `.ly` files and passing them to the `<LilyPond>` component, update your code to instead pass the `.ly` file to a `render()` function inside of the frontmatter of an `.astro` file:

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

The `render()` function takes your `.ly` file and returns a `Score` component which you can render on the page. The `<LilyPond>` component and its `astro-lilypond/component` export are gone entirely — there's no lower-level primitive left to import directly.

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

Plain `.ly`/`.ily` imports get the same `meta` object, so a score's metadata reads identically whether it came from a collection or a direct import.

Additionally, there is now support for generating `pdf` files from scores which can be exposed as download links. Set `{ pdf: true }` in the `render()` config, then use and display `pdf` from the result:

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

A new `renderAll()` function renders many scores at once; every entry in a `getCollection()` result.

`<Score>` accepts the same props as `<LilyPond>` did: `pageLimit`, `class`, `style`, and `alt` props. Once you've set up your `render` function, you should be able to swap out `<LilyPond content={...} />` for `<Score />`.
