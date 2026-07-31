---
"astro-lilypond": minor
---

Add a `<Score>` component for the common case of just displaying a score, without needing to call `render()` from frontmatter:

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
