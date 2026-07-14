# astro-lilypond

An [Astro](https://astro.build) integration for rendering [LilyPond](https://lilypond.org) music notation to images.

## Quick Start

### 1. Installation

```sh
pnpm add astro-lilypond
```

### 2. Add to Astro Config

```sh
// astro.config.mjs
import { defineConfig } from 'astro/config';
import lilypond from 'astro-lilypond';

export default defineConfig({
  integrations: [lilypond()]
});
```

### 3. Use in Markdown

````markdown
```lilypond
  \\score ...
```
````

Learn more at the [`astro-lilypond` docs](https://lilypond.ky.fyi)!
