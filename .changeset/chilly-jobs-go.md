---
"astro-lilypond": minor
---

**BREAKING:** Add a new `config` option for `defaults.cropScale`. which allows modifying the rendered dimensions of cropped `<img>` tags to compensate for the fact that LilyPond renders size units in points/mm, which, when translated to pixels, can appear too small. `cropScale` is set to `1.5` by default. As a consequence, this version will render cropped images larger than before.

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
