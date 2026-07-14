# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
pnpm build          # compile src/*.ts → dist/ (tsc)
pnpm test           # run vitest in watch mode
pnpm test --run     # run vitest once (CI / one-shot)
pnpm check          # biome lint + format check
pnpm check:fix      # biome lint + format (auto-fix)

# Run a single test file
pnpm test --run tests/render.test.js

# Build and run the docs site locally
pnpm --filter docs dev
pnpm --filter docs build
```

`pnpm build` must be run before `pnpm --filter docs build` because the docs workspace imports `astro-lilypond` from `dist/`.

## Architecture

This is a pnpm workspace with two packages:

- **root** (`astro-lilypond`) — the Astro integration library
- **`docs/`** — a Starlight site that documents and live-demos the integration

### Integration entry point (`src/index.ts`)

Exports a single `lilypond()` function that returns an `AstroIntegration`. Two processor paths are supported; anything else throws immediately with a descriptive message:

- **satteri** (Astro 7 default) — registers `satteriLilypondPlugin()` into `mdastPlugins` via `@astrojs/markdown-satteri`'s `satteri()` helper.
- **unified** (explicit opt-in via `@astrojs/markdown-remark`) — adds `remarkLilypondPlugin` and `rehypeLilypondPlugin` into the unified pipeline.

The old `markdown.remarkPlugins` / `markdown.rehypePlugins` array config style (pre-processor API) is not supported.

### Markdown plugin (`src/satteri-plugin.ts`)

Implements `MdastPluginDefinition` from `satteri`. The `code` visitor fires for every fenced code block; it returns `undefined` for non-`lilypond` blocks (no-op) and an mdast `Html` node (`{ type: 'html', value: svgString }`) for `lilypond` blocks. The `{ type: 'html' }` form is intentional — Sätteri's `{ rawHtml }` escape hatch applies MDX brace-escaping that would corrupt SVG content.

### LilyPond renderer (`src/render.ts`)

Replaces the removed `lilynode` dependency. Calls the `lilypond` binary directly via `child_process.execFile`, writing source to a temp dir and cleaning up in a `finally` block. Key behaviour:

- `crop: true` (default) passes `--define-default crop`, which causes LilyPond to write `output.cropped.svg` instead of the full-page `output.svg`. The `readOutputFile` helper tries the cropped path first, then falls back to the standard and page-numbered variants.
- The `@types/hast` version shipped with Astro conflicts with any separately-installed copy — the rehype plugin (`src/rehype-plugin.ts`) therefore types its `tree` parameter as `any` to avoid the structural mismatch. This is expected and annotated in that file.

### Remaining plugins (`src/remark-plugin.ts`, `src/rehype-plugin.ts`)

Not used by the integration itself (Sätteri only). They are kept as exported utilities for consumers who manually compose remark/rehype pipelines and are covered by their own tests.

### Tests

All tests live in `tests/`. The `lilynode` / render module is always mocked — tests do not invoke the real `lilypond` binary. The mock target is `../src/render.js` (the compiled JS path that vitest resolves at runtime).

### `docs/` workspace

Uses Starlight + `astro-lilypond`. Requires Astro 7's Content Layer API: collection config is at `src/content.config.ts` (not `src/content/config.ts`) and uses `docsLoader()` from `@astrojs/starlight/loaders`. The `@astrojs/markdown-satteri` package must be resolvable from the integration's location — it is added as a `devDependency` of the root package for this reason.
