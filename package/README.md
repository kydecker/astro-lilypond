# astro-lilypond

An [Astro](https://astro.build) integration for rendering [LilyPond](https://lilypond.org) music notation to images.

- Render musical scores via Markdown or with an Astro component.
- Works with remark and satteri Markdown processors out-of-the-box.
- Zero client-side JavaScript! Images are compiled at build time.
- Automatic `alt` text generated from the score’s title and composer. (Or supply your own.)
- Use the content loader to pass in a folder full of `.ly` files and get back an Astro content collection.
- Works with all LilyPond syntax.

## Quick start

```sh
npx astro add astro-lilypond
```

For more info, refer to the docs: https://lilypond.ky.fyi

Happy notating!
