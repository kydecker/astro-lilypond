import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import lilypond from "astro-lilypond";
import starlightThemeFlexoki from 'starlight-theme-flexoki'

export default defineConfig({
  integrations: [
    lilypond({
      version: "2.24.0"
    }),
		starlight({
			title: "astro-lilypond",
			description:
        "Render LilyPond music notation to inline SVG in your Astro site.",
      plugins: [starlightThemeFlexoki({
        accentColor: "green"
      })],
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/kydecker/astro-lilypond",
				},
			],
      sidebar: [
        {
          label: "Introduction",
          slug: ""
        },
        "getting-started",
        "configuration",
        "styling",
        "lilypond-syntax",
      ],
		}),

  ],
  devToolbar: {
    enabled: false
	}
});
