import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";
import lilypond from "astro-lilypond";

export default defineConfig({
	outDir: "./dist/unified",
	cacheDir: "./.cache/unified",
	markdown: {
		processor: unified(),
	},
	integrations: [
		lilypond({
			defaults: {
				version: "2.26.0",
				cropScale: 2,
			},
			includePaths: ["./src/snippets"],
		}),
		mdx(),
	],
});
