import { defineConfig } from "astro/config";
import lilypond from "astro-lilypond";

export default defineConfig({
	integrations: [
		lilypond({
			defaults: {
				version: "2.26.0",
				cropScale: 2,
			},
		}),
	],
});
