---
title: Usage
description: Render LilyPond notation in Markdown or directly in Astro components.
---

## Markdown

Use a fenced code block with the `lilypond` (or `ly`) language tag:

````md
```lilypond
\version "2.24.0"
\relative c' {
  c4 d e f | g2 e2 |
}
```
````

The block is replaced with an inline SVG at build time. See [LilyPond Syntax](/lilypond-syntax/) for common patterns.

## Component

The `<LilyPond>` component renders notation in any `.astro` file. Import a `.ly` file and pass it to the `content` prop.

```astro
---
import LilyPond from 'astro-lilypond/component';
import prelude from './scores/prelude.ly';
---

<LilyPond content={prelude} />
```

The `version` and `format` configured in your integration options apply automatically.

### Props

#### `content`

**Type:** `string`  
**Required:** yes

The pre-rendered HTML from an imported `.ly` file.

#### `class`

**Type:** `string`

Additional class name(s) merged onto the rendered `<svg>` or `<img>` element alongside the default `lilypond` class. See [Styling](/styling/) for how to use this for per-instance styles.

#### `style`

**Type:** `string`

Inline styles applied directly to the rendered element.
