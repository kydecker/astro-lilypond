import { getViteConfig } from "astro/config";

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
				},
			},
		],
	},
});
