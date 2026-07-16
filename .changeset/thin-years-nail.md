---
"astro-lilypond": minor
---

Update rendering to use `<img>` tags for all content, including `.svg`. Previously, svg scores were inlined in the page. However, the `cairo`-based backend renderer makes heavy use of SVG's `<use>` element. When inlined on the page, these `<use>` tags can conflict with one another across scores, corrupting the display of notation. To avoid this, SVG elements are now rendered within an `<img>` tag. This has the benefit of reducing the number of HTML nodes on the page, but the drawback of no longer being able to inherit `currentColor` for noteheads. Given that the desire for inverted staff paper is unusual (and for many people, likely undesirable), this feels like an acceptable tradeoff.

To prevent scores from displaying as black-on-black when in dark mode, add global styles to `.lilypond`:

```css
.lilypond {
  background-color: white;
}
```
