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
			exclude: [
				...coverageConfigDefaults.exclude,
				"src/**/__tests__/**",
				"src/types",
				"src/binary/index.ts",
				"src/plugins/index.ts",
				"src/plugins/types.ts",
				"src/utils/index.ts",
			],
			thresholds: {
				lines: 95,
				statements: 95,
				functions: 95,
				branches: 95,
			},
		},
	},
});
