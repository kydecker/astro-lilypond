import { defineConfig } from "astro/config";
import lilypond from "astro-lilypond";

export default defineConfig({
	srcDir: "./src-dev",
	outDir: "./dist/dev-errors",
	cacheDir: "./.cache/dev-errors",
	integrations: [
		lilypond({
			defaults: {
				version: "2.26.0",
			},
		}),
	],
});
