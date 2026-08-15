import { defineConfig, devices } from "@playwright/test";

const DEV_ERRORS_SPEC = /dev-inline-errors\.spec\.ts/;

const SITES = [
	{ name: "satteri", port: 4321 },
	{ name: "unified", port: 4322 },
	{ name: "dev", port: 4323, dev: true },
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
	projects: SITES.map(({ name, port, dev }) => ({
		name,
		use: {
			...devices["Desktop Chrome"],
			baseURL: `http://localhost:${port}`,
		},
		...(dev ? { testMatch: DEV_ERRORS_SPEC } : { testIgnore: DEV_ERRORS_SPEC }),
	})),
	webServer: SITES.map(({ name, port, dev }) => ({
		command: `pnpm exec astro ${dev ? "dev" : "preview --background"} --config astro.config.${name}.mjs --port ${port}`,
		url: `http://localhost:${port}`,
		reuseExistingServer: !process.env.CI,
		timeout: 30_000,
	})),
});
