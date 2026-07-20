import { getViteConfig } from "astro/config";

export default getViteConfig({
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
	},
});
