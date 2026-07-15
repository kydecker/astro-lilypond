---
title: Configuration
description: Options available when calling lilypond() in your Astro config.
---

Pass options to the integration when registering it in `astro.config.mjs`:

```js {7-9}
// astro.config.mjs
import { defineConfig } from 'astro/config';
import lilypond from 'astro-lilypond';

export default defineConfig({
  integrations: [
    lilypond({
      // config
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

Specify a `version` in the LilyPond config to apply it to all LilyPond blocks by default:

```diff lang="js"
// astro.config.mjs  
export default defineConfig({
   integrations: [
    lilypond({
+     version: "2.24.0"
    }),
  ],
});
```

With `version` set in the config, blocks can omit it:

````diff lang="md"
```lilypond
-  \version "2.24.0"
  \relative c' { c4 d e f }
```
````

Blocks with an explicit `\version` declaration will always be used, regardless of this config.

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

### `crop`

**Type:** `boolean`  
**Default:** `true`

When `true`, the margins are removed and the page is cropped to fit the rendered staves.

Set to `false` to preserve full page dimensions:

```js
lilypond({ crop: false })
```

This setting can be overridden at the component level when using the `<LilyPond>` component:

```astro
<LilyPond crop={false} />
```
