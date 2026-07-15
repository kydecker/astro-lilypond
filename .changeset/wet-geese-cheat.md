---
"astro-lilypond": minor
---

Enable setting global and per-component 'crop' settings.

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
import { defineConfig } from 'astro/config';
import lilypond from 'astro-lilypond';

export default defineConfig({
  integrations: [
    lilypond({
      crop: false
    }),
  ],
});
```
