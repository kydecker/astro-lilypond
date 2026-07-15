# astro-lilypond

An [Astro](https://astro.build) integration for rendering [LilyPond](https://lilypond.org) music notation to images.

- Render LilyPond via Markdown or with a `<LilyPond>` component
- Works with both `unified()` and `satteri()` Markdown processors
- Supports all LilyPond syntax

Docs: https://lilypond.ky.fyi

## Quick Start

### Prerequisites

Install the LilyPond binary directly from [lilypond.org](https://lilypond.org/download.html) or with `brew install lilypond` (Mac) or `apt install lilypond` (Linux).

### Installation

#### 1. Install `astro-lilypond`

```sh
pnpm add astro-lilypond
```

#### 2. Add the integration to your Astro config

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import lilypond from 'astro-lilypond';

export default defineConfig({
  integrations: [lilypond()]
});
```

#### 3. Write your music

Write LilyPond code within fenced code blocks with the `lilypond` or `ly` language tag.

````md
```lilypond
  \\score ...
```
````

Your score will be built to `.svg` or `.png` and display alongside the rest of your content.
