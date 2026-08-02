import { defineConfig, devices } from "@playwright/test";

const GENERAL_PORT = 4321;
const SATTERI_PORT = 4322;
const UNIFIED_PORT = 4323;
const generalURL = `http://localhost:${GENERAL_PORT}`;
const satteriURL = `http://localhost:${SATTERI_PORT}`;
const unifiedURL = `http://localhost:${UNIFIED_PORT}`;

export default defineConfig({
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: "list",
	globalSetup: "./global-setup.ts",
	use: {
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "general",
			testDir: "./general/tests",
			use: { ...devices["Desktop Chrome"], baseURL: generalURL },
		},
		{
			name: "satteri",
			testDir: "./satteri/tests",
			use: { ...devices["Desktop Chrome"], baseURL: satteriURL },
		},
		{
			name: "unified",
			testDir: "./unified/tests",
			use: { ...devices["Desktop Chrome"], baseURL: unifiedURL },
		},
	],
	webServer: [
		{
			command:
				"pnpm exec astro build --root general && pnpm exec astro preview --root general --port 4321",
			url: generalURL,
			reuseExistingServer: !process.env.CI,
			// Real `lilypond` invocations during `astro build` are slow.
			timeout: 120_000,
		},
		{
			command:
				"pnpm exec astro build --root satteri && pnpm exec astro preview --root satteri --port 4322",
			url: satteriURL,
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
		},
		{
			command:
				"pnpm exec astro build --root unified && pnpm exec astro preview --root unified --port 4323",
			url: unifiedURL,
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
		},
	],
});
