---
title: Configuration
description: Options available when calling lilypond() in your Astro config.
---

Pass options to the integration when registering it in `astro.config.mjs`:

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import lilypond from 'astro-lilypond';

export default defineConfig({
  integrations: [
    lilypond({
      // options go here
    }),
  ],
});
```

## Options

### `version`

**Type:** `string`  
**Default:** `undefined`

All LilyPond content must specify `\version` at the start so that the compiler knows how to output the score.

````md
```lilypond
\version "2.24.0"
\relative c' { c4 d e f }
```
````

If you specify a `version` in the LilyPond config, it will apply to all LilyPond code blocks:

```js
lilypond({ version: '2.24.0' })
```

With `version` set, the declaration is inserted for you, so blocks can omit it:

````md
```lilypond
\relative c' { c4 d e f }
```
````

If a block already contains a `\version` declaration it is left untouched, regardless of this option. This lets you override the version for a single block while using the global default everywhere else.

### `format`

**Type:** `"svg" | "png" | { type: "png"; resolution: number }`  
**Default:** `"svg"`

The output format passed to the LilyPond binary. Controls how the rendered output is embedded in the page.

```js
lilypond({ format: 'png' })
```

| Value | Embedded as |
|---|---|
| `"svg"` | Inline `<svg>` element (default) |
| `"png"` | `<img>` element with a base64 data URI, at the default resolution (144 DPI) |
| `{ type: "png", resolution: number }` | `<img>` element with a base64 data URI, at the specified DPI |

SVG is the best choice for most web use — it scales to any size and stays sharp on high-DPI screens. Use PNG when you need a specific pixel resolution:

```js
lilypond({ format: { type: 'png', resolution: 300 } })
```
