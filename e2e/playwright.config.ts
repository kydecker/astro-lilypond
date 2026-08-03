import { defineConfig, devices } from "@playwright/test";

const SITES = [
	{ name: "satteri", port: 4321 },
	{ name: "unified", port: 4322 },
];

const DEV_ERRORS_PORT = 4323;
const DEV_ERRORS_SPEC = /dev-inline-errors\.spec\.ts/;

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: "list",
	use: {
		trace: "on-first-retry",
	},
	projects: [
		...SITES.map(({ name, port }) => ({
			name,
			use: {
				...devices["Desktop Chrome"],
				baseURL: `http://localhost:${port}`,
			},
			testIgnore: DEV_ERRORS_SPEC,
		})),
		{
			name: "dev-errors",
			use: {
				...devices["Desktop Chrome"],
				baseURL: `http://localhost:${DEV_ERRORS_PORT}`,
			},
			testMatch: DEV_ERRORS_SPEC,
		},
	],
	webServer: [
		...SITES.map(({ name, port }) => ({
			command: `pnpm exec astro preview --config astro.config.${name}.mjs --port ${port}`,
			url: `http://localhost:${port}`,
			reuseExistingServer: !process.env.CI,
			timeout: 30_000,
		})),
		{
			// `astro dev`, not `preview` — this is the whole point: the fixture
			// page under `astro.config.dev-errors.mjs` has permanently broken
			// scores, which must never go through `astro build`.
			command: `pnpm exec astro dev --config astro.config.dev-errors.mjs --port ${DEV_ERRORS_PORT}`,
			url: `http://localhost:${DEV_ERRORS_PORT}`,
			reuseExistingServer: !process.env.CI,
			timeout: 30_000,
			// Astro auto-backgrounds `astro dev` (detached daemon, no foreground
			// process to track) when it detects it's being run by an AI coding
			// agent. That breaks Playwright's webServer process management, so
			// force normal foreground behavior regardless of the invoking shell.
			env: { ASTRO_DEV_BACKGROUND: "1" },
		},
	],
});
