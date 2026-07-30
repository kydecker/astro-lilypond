// Plain `tsc` (unlike Astro's language server) has no built-in notion of
// `.astro` files. This ambient module declaration lets `index.ts` import
// `LilyPond.astro` (dynamically, at render time — see `createScoreComponent`
// in `index.ts`) with a real type instead of an implicit `any`.
declare module "*.astro" {
	import type { AstroComponentFactory } from "astro/runtime/server/index.js";

	const Component: AstroComponentFactory;
	export default Component;
}
