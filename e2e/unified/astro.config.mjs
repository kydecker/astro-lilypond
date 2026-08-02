import { unified } from "@astrojs/markdown-remark";
import { defineConfig } from "astro/config";
import lilypond from "astro-lilypond";

export default defineConfig({
	markdown: {
		processor: unified(),
	},
	integrations: [
		lilypond({
			defaults: {
				version: "2.26.0",
			},
		}),
	],
});
