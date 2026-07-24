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
			defaults: {
				version: "2.26.0",
			},
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
				{
					label: "Start Here",
					items: ["getting-started", "examples"],
				},
				{
					label: "Guides",
					items: ["guides/markdown", "guides/component", "guides/styling"],
				},
				{
					label: "Reference",
					items: [
						"reference/configuration",
						"reference/component",
						"reference/styling",
					],
				},
				{
					label: "Resources",
					items: [
						{
							label: "Changelog",
							link: "/changelog/",
						},
						"resources/syntax",
						"resources/extensions",
						"resources/published-music",
					],
				},
			],
			editLink: {
				baseUrl: "https://github.com/kydecker/astro-lilypond/edit/main/docs/",
			},
		}),
	],
	redirects: {
		"/usage": "/guides/component",
		"/component": "/guides/component",
		"/markdown": "/guides/markdown",
		"/styling": "/guides/styling",
		"/lilypond-syntax": "/resources/syntax",
		"/resources": "/resources/syntax",
		"/configuration": "/reference/configuration",
	},
	devToolbar: {
		enabled: false,
	},
});
