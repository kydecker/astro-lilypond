# astro-lilypond

An [Astro](https://astro.build) integration for rendering [LilyPond](https://lilypond.org) music notation to images.

- Render musical scores via Markdown or with an Astro component.
- Works with remark and satteri Markdown processors out-of-the-box.
- Zero client-side JavaScript! Images are compiled at build time.
- Automatic `alt` text generated from the score’s title and composer. (Or supply your own.)
- Use the content loader to pass in a folder full of `.ly` files and get back an Astro content collection.
- Works with all LilyPond syntax.

Read the docs: https://lilypond.ky.fyi

## Quick Start

### 1. Install `astro-lilypond`

```sh
pnpm add astro-lilypond
```

### 2. Add the integration to your Astro config

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import lilypond from 'astro-lilypond';

export default defineConfig({
  integrations: [lilypond()]
});
```

### 3. Write your music

Write LilyPond code within fenced code blocks with the `lilypond`, `ly`, or `ily` language tag.

````md
```lilypond
  \\score ...
```
````

Your score will be built to `.svg` or `.png` and display alongside the rest of your content.

---

For more info, refer to the docs: https://lilypond.ky.fyi

Happy notating!
