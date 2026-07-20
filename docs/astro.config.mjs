import cloudflare from "@astrojs/cloudflare";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import lilypond from "astro-lilypond";
import starlightThemeFlexoki from "starlight-theme-flexoki";
import lilypondGrammar from "./src/lilypond.tmLanguage.mjs";

export default defineConfig({
	site: "https://lilypond.ky.fyi",
	adapter: cloudflare({
		prerenderEnvironment: "node",
		imageService: "passthrough",
	}),
	integrations: [
		lilypond({
			version: "2.26.0",
		}),
		starlight({
			title: "Astro LilyPond",
			description: "Render LilyPond music notation to images with Astro.",
			plugins: [
				starlightThemeFlexoki({
					accentColor: "green",
				}),
			],
			disable404Route: true,
			customCss: [
				"@fontsource-variable/eb-garamond/wght.css",
				// "@fontsource-variable/eb-garamond/wght-italic.css",
				"./src/styles/docs.css",
			],
			expressiveCode: {
				shiki: {
					langs: [lilypondGrammar],
				},
				styleOverrides: {
					uiFontFamily:
						"ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
				},
			},
			favicon: "/favicon.svg",
			head: [
				{
					tag: "meta",
					attrs: {
						property: "og:image",
						content: "/preview.png",
					},
				},
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
					href: "https://www.npmjs.com/package/astro-lilypond",
				},
			],
			sidebar: [
				"getting-started",
				"configuration",
				"usage",
				"styling",
				"lilypond-syntax",
				"examples",
				"resources",
			],
			editLink: {
				baseUrl: "https://github.com/kydecker/astro-lilypond/edit/main/docs/",
			},
		}),
	],
	devToolbar: {
		enabled: false,
	},
});
