import { getViteConfig } from "astro/config";

// "unit": fast, fully mocked, no external binaries — this is what `vitest`/
// `npm test` runs by default.
// "integration": exercises the real `lilypond` binary against fixtures in
// tests/integration/scores; slower, so it's opt-in via
// `npm run test:integration` (`vitest run --project integration`).
export default getViteConfig({
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					include: ["tests/unit/**/*.test.ts"],
				},
			},
			{
				extends: true,
				test: {
					name: "integration",
					include: ["tests/integration/**/*.test.ts"],
					testTimeout: 60_000,
					hookTimeout: 60_000,
				},
			},
		],
	},
});
