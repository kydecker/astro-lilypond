import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					include: ["src/**/*.test.ts", "components/**/*.test.ts"],
				},
			},
			{
				extends: true,
				test: {
					name: "integration",
					include: ["tests/*.test.ts"],
					testTimeout: 60_000,
					hookTimeout: 60_000,
					maxConcurrency: 10,
				},
			},
		],
		coverage: {
			reporter: ["text", "json-summary", "json"],
			reportOnFailure: true,
			include: ["src/**/*.ts"],
			exclude: [...coverageConfigDefaults.exclude, "src/**/__tests__/**"],
			thresholds: {
				lines: 90,
				statements: 90,
				functions: 90,
				branches: 90,
			},
		},
	},
});
