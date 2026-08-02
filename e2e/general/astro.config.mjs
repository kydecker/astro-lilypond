import { defineConfig } from "astro/config";
import lilypond from "astro-lilypond";

export default defineConfig({
	integrations: [
		lilypond({
			defaults: {
				version: "2.26.0",
				// A round, distinctive value (library default is 1.5) so tests can
				// verify cropped `<img>` width/height scale by exactly this factor
				// relative to the underlying SVG asset's own dimensions.
				cropScale: 2,
			},
		}),
	],
});
