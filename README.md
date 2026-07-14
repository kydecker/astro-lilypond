# astro-lilypond

An [Astro](https://astro.build) integration for rendering [LilyPond](https://lilypond.org) music notation to images.

## Quick Start

### Prerequisites

Install the LilyPond binary directly from [lilypond.org](https://lilypond.org/download.html) or with a package manager like [Homebrew](https://formulae.brew.sh/formula/lilypond).

```sh
brew install lilypond
```

### Installation

#### 1. Install `astro-lilypond`:

```sh
pnpm add astro-lilypond
```

#### 2. Add the integration to your Astro config:

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import lilypond from 'astro-lilypond';

export default defineConfig({
  integrations: [lilypond()]
});
```

#### 3. Use in Markdown:

````md
```lilypond
  \\score ...
```
````

## Docs

Learn more at the [`astro-lilypond` docs](https://lilypond.ky.fyi).
