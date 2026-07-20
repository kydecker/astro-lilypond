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
			customCss: ["./src/styles/docs.css"],
			expressiveCode: {
				shiki: {
					langs: [lilypondGrammar],
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
				{
					tag: "script",
					attrs: {
						src: "https://cdn.usefathom.com/script.js",
						"data-site": "ZRLAYFME",
						defer: true,
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
				{
					label: "Changelog",
					link: "https://github.com/kydecker/astro-lilypond/releases",
				},
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
