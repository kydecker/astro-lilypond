import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";
import lilypond from "astro-lilypond";

export default defineConfig({
	outDir: "./dist/satteri",
	cacheDir: "./.cache/satteri",
	integrations: [
		lilypond({
			defaults: {
				version: "2.26.0",
				cropScale: 2,
			},
		}),
		mdx(),
	],
});
