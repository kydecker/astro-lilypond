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

Learn more about [LilyPond syntax](https://lilypond.org/doc/v2.24/Documentation/web/text-input).

## Configuration

There are no configuration options for the `lilypond` integration currently.
