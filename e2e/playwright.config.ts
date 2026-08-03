import { defineConfig, devices } from "@playwright/test";

const SITES = [
	{ name: "satteri", port: 4321 },
	{ name: "unified", port: 4322 },
];

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: "list",
	use: {
		trace: "on-first-retry",
	},
	projects: SITES.map(({ name, port }) => ({
		name,
		use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${port}` },
	})),
	webServer: SITES.map(({ name, port }) => ({
		command: `pnpm exec astro preview --config astro.config.${name}.mjs --port ${port}`,
		url: `http://localhost:${port}`,
		reuseExistingServer: !process.env.CI,
		timeout: 30_000,
	})),
});
