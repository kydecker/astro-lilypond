import { defineConfig } from "astro/config";
import lilypond from "astro-lilypond";

// Isolated from `./src` on purpose: its one page contains a permanently
// broken score, so it must never go through `astro build` (that's the whole
// point — build/CI should still fail loudly). Only ever run via `astro dev`,
// to exercise this integration's dev-only inline error rendering end to end.
export default defineConfig({
	srcDir: "./src-dev-errors",
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
