import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import lilypond from "astro-lilypond";
import starlightThemeFlexoki from 'starlight-theme-flexoki'
import lilypondGrammar from "./src/lilypond.tmLanguage.mjs"

export default defineConfig({
  integrations: [
    lilypond({
      version: "2.24.0",
    }),
		starlight({
			title: "astro-lilypond",
			description:
        "Render LilyPond music notation to images with Astro.",
      plugins: [starlightThemeFlexoki({
        accentColor: "green"
      })],
      expressiveCode: {
        shiki: {
          langs: [lilypondGrammar],
        },
      },
      favicon: '/favicon.svg',
      head: [
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: '/preview.png'
          }
        }
      ],
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/kydecker/astro-lilypond",
        },
        {
          icon: "npm",
          label: "npmx",
          href: "https://npmx.dev/package/astro-lilypond"
				}
			],
      sidebar: [
        {
          label: "Introduction",
          slug: ""
        },
        "getting-started",
        "configuration",
        "usage",
        "styling",
        "lilypond-syntax",
      ],
      editLink: {
        baseUrl: 'https://github.com/kydecker/astro-lilypond/edit/main/docs/'
      }
		}),
  ],
  devToolbar: {
    enabled: false
	}
});
