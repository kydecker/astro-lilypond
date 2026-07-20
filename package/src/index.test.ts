import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./render.js", () => ({
	render: vi.fn().mockRejectedValue(new Error("mock render failure")),
	FORMATS: ["png", "svg"],
	defaultOptions: {
		format: "svg",
		resolution: 144,
		binaryPath: "lilypond",
		crop: true,
		timeout: 60_000,
	},
}));

vi.mock("./pruneOrphanedAssets.js", () => ({
	pruneOrphanedAssets: vi.fn(),
}));

import { DEV_ASSETS_DIR_ENV } from "./devAssetsEnvVar.js";
import lilypond from "./index.js";
import { pruneOrphanedAssets } from "./pruneOrphanedAssets.js";

const mockPruneOrphanedAssets = vi.mocked(pruneOrphanedAssets);

const FAKE_PUBLIC_DIR = new URL("file:///project/public/");

const FAKE_CACHE_DIR = new URL("file:///project/node_modules/.astro/");

interface SetupHookArgs {
	command?: "dev" | "build" | "preview" | "sync";
	config: {
		markdown?: {
			processor?: { name: string; options?: Record<string, unknown> };
		};
		publicDir?: URL;
		cacheDir?: URL;
		base?: string;
	};
	updateConfig: ReturnType<typeof vi.fn>;
	logger: { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };
}

function baseConfig(
	overrides: Partial<SetupHookArgs["config"]> = {},
): SetupHookArgs["config"] {
	return {
		publicDir: FAKE_PUBLIC_DIR,
		cacheDir: FAKE_CACHE_DIR,
		base: "/",
		...overrides,
	};
}

describe("lilypond integration", () => {
	it("exports a function", () => {
		expect(typeof lilypond).toBe("function");
	});

	it("returns an integration object with the correct name", () => {
		const integration = lilypond();
		expect(integration.name).toBe("astro-lilypond");
	});

	it("has an astro:config:setup hook", () => {
		const integration = lilypond();
		expect(typeof integration.hooks?.["astro:config:setup"]).toBe("function");
	});

	describe("vite plugin transform", () => {
		async function getVitePlugin(opts = {}) {
			const updateConfig = vi.fn();
			vi.doMock("@astrojs/markdown-satteri", () => ({
				satteri: vi.fn((o: unknown) => ({ name: "satteri", options: o })),
				isSatteriProcessor: vi.fn(() => true),
			}));
			const integration = lilypond(opts);
			await integration.hooks["astro:config:setup"]?.({
				command: "build",
				config: baseConfig({
					markdown: { processor: { name: "satteri", options: {} } },
				}),
				updateConfig,
				injectRoute: vi.fn(),
				logger: { info: vi.fn(), warn: vi.fn() },
			} as never);
			vi.doUnmock("@astrojs/markdown-satteri");
			const { plugins } = (
				updateConfig.mock.calls[0][0] as { vite: { plugins: unknown[] } }
			).vite;
			return plugins[0] as {
				transform: (
					src: string,
					id: string,
				) => Promise<{ code: string } | undefined>;
			};
		}

		it("transforms .ily files", async () => {
			const plugin = await getVitePlugin();
			// transform returns undefined for unrecognized extensions
			const skipped = await plugin.transform("", "score.txt");
			expect(skipped).toBeUndefined();
		});

		it.each([".ly", ".lilypond", ".ily"])(
			"handles %s extension",
			async (ext) => {
				const plugin = await getVitePlugin();
				// render() is mocked to always reject — we're only verifying the
				// plugin doesn't skip the file (i.e. it calls render() at all)
				await expect(plugin.transform("", `score${ext}`)).rejects.toThrow(
					"mock render failure",
				);
			},
		);
	});

	it("registers the Sätteri mdast plugin when processor is satteri", async () => {
		const { updateConfig, logger }: SetupHookArgs = {
			config: baseConfig(),
			updateConfig: vi.fn(),
			logger: { info: vi.fn(), warn: vi.fn() },
		};

		vi.doMock("@astrojs/markdown-satteri", () => ({
			satteri: vi.fn((opts: unknown) => ({ name: "satteri", options: opts })),
			isSatteriProcessor: vi.fn(() => true),
		}));

		const config = baseConfig({
			markdown: { processor: { name: "satteri", options: {} } },
		});

		const integration = lilypond();
		await integration.hooks["astro:config:setup"]?.({
			command: "build",
			config,
			updateConfig,
			injectRoute: vi.fn(),
			logger,
		} as never);

		expect(updateConfig).toHaveBeenCalledTimes(2);
		// First call registers Vite plugins; second call sets the markdown processor.
		expect(
			(updateConfig.mock.calls[1][0] as { markdown?: { processor?: unknown } })
				.markdown?.processor,
		).toBeDefined();

		vi.doUnmock("@astrojs/markdown-satteri");
	});

	it("registers remark/rehype plugins when processor is unified", async () => {
		const updateConfig = vi.fn();
		const logger = { info: vi.fn(), warn: vi.fn() };

		vi.doMock("@astrojs/markdown-remark", () => ({
			unified: vi.fn((opts: unknown) => ({ name: "unified", options: opts })),
			isUnifiedProcessor: vi.fn(() => true),
		}));

		const config = baseConfig({
			markdown: { processor: { name: "unified", options: {} } },
		});

		const integration = lilypond();
		await integration.hooks["astro:config:setup"]?.({
			command: "build",
			config,
			updateConfig,
			injectRoute: vi.fn(),
			logger,
		} as never);

		expect(updateConfig).toHaveBeenCalledTimes(2);
		// First call registers Vite plugins; second call sets the markdown processor.
		const { remarkPlugins, rehypePlugins } = (
			updateConfig.mock.calls[1][0] as {
				markdown: {
					processor: {
						options: { remarkPlugins: unknown[]; rehypePlugins: unknown[] };
					};
				};
			}
		).markdown.processor.options;
		expect(remarkPlugins.length).toBeGreaterThan(0);
		expect(rehypePlugins.length).toBeGreaterThan(0);

		vi.doUnmock("@astrojs/markdown-remark");
	});

	it("throws when no processor-based config is present", async () => {
		const updateConfig = vi.fn();
		const logger = { info: vi.fn(), warn: vi.fn() };

		const integration = lilypond();
		await expect(
			integration.hooks["astro:config:setup"]?.({
				command: "build",
				config: baseConfig({ markdown: {} }),
				updateConfig,
				injectRoute: vi.fn(),
				logger,
			} as never),
		).rejects.toThrow("processor-based");
	});

	it("has an astro:config:done hook", () => {
		const integration = lilypond();
		expect(typeof integration.hooks?.["astro:config:done"]).toBe("function");
	});

	it("injects types with the correct filename", () => {
		const injectTypes = vi.fn();
		const integration = lilypond();
		integration.hooks["astro:config:done"]?.({ injectTypes } as never);
		expect(injectTypes).toHaveBeenCalledOnce();
		expect(injectTypes.mock.calls[0][0].filename).toBe("ly-types.d.ts");
	});

	it("injected types declare modules for .ly, .lilypond, and .ily", () => {
		const injectTypes = vi.fn();
		const integration = lilypond();
		integration.hooks["astro:config:done"]?.({ injectTypes } as never);
		const { content } = injectTypes.mock.calls[0][0] as { content: string };
		expect(content).toContain('declare module "*.ly"');
		expect(content).toContain('declare module "*.lilypond"');
		expect(content).toContain('declare module "*.ily"');
	});

	it("injected type declarations export a default html string", () => {
		const injectTypes = vi.fn();
		const integration = lilypond();
		integration.hooks["astro:config:done"]?.({ injectTypes } as never);
		const { content } = injectTypes.mock.calls[0][0] as { content: string };
		expect(content.match(/export default html/g)?.length).toBe(3);
	});

	it("includes the detected processor name in the error", async () => {
		const updateConfig = vi.fn();
		const logger = { info: vi.fn(), warn: vi.fn() };

		const integration = lilypond();
		await expect(
			integration.hooks["astro:config:setup"]?.({
				command: "build",
				config: baseConfig({
					markdown: { processor: { name: "custom-proc" } },
				}),
				updateConfig,
				injectRoute: vi.fn(),
				logger,
			} as never),
		).rejects.toThrow("custom-proc");
	});

	describe("astro:build:done", () => {
		it("has an astro:build:done hook", () => {
			const integration = lilypond();
			expect(typeof integration.hooks?.["astro:build:done"]).toBe("function");
		});

		it("does nothing if astro:config:setup never ran", async () => {
			const integration = lilypond();
			await integration.hooks["astro:build:done"]?.({
				logger: { info: vi.fn(), warn: vi.fn() },
			} as never);
			expect(mockPruneOrphanedAssets).not.toHaveBeenCalled();
		});

		it("prunes the resolved assets dir under publicDir/outputDir after setup ran", async () => {
			vi.doMock("@astrojs/markdown-satteri", () => ({
				satteri: vi.fn((o: unknown) => ({ name: "satteri", options: o })),
				isSatteriProcessor: vi.fn(() => true),
			}));

			const integration = lilypond();
			const logger = { info: vi.fn(), warn: vi.fn() };
			await integration.hooks["astro:config:setup"]?.({
				command: "build",
				config: baseConfig({
					markdown: { processor: { name: "satteri", options: {} } },
				}),
				updateConfig: vi.fn(),
				injectRoute: vi.fn(),
				logger,
			} as never);
			vi.doUnmock("@astrojs/markdown-satteri");

			await integration.hooks["astro:build:done"]?.({ logger } as never);

			expect(mockPruneOrphanedAssets).toHaveBeenCalledWith({
				dir: "/project/public/_lilypond",
				referenced: expect.any(Set),
				logger,
			});
		});

		it("uses a custom outputDir name when provided", async () => {
			vi.doMock("@astrojs/markdown-satteri", () => ({
				satteri: vi.fn((o: unknown) => ({ name: "satteri", options: o })),
				isSatteriProcessor: vi.fn(() => true),
			}));

			const integration = lilypond({ outputDir: "scores" });
			const logger = { info: vi.fn(), warn: vi.fn() };
			await integration.hooks["astro:config:setup"]?.({
				command: "build",
				config: baseConfig({
					markdown: { processor: { name: "satteri", options: {} } },
				}),
				updateConfig: vi.fn(),
				injectRoute: vi.fn(),
				logger,
			} as never);
			vi.doUnmock("@astrojs/markdown-satteri");

			await integration.hooks["astro:build:done"]?.({ logger } as never);

			expect(mockPruneOrphanedAssets).toHaveBeenCalledWith(
				expect.objectContaining({ dir: "/project/public/scores" }),
			);
		});
	});

	describe("dev vs. build assets directory", () => {
		afterEach(() => {
			delete process.env[DEV_ASSETS_DIR_ENV];
		});

		async function setupWithCommand(command: "dev" | "build") {
			vi.doMock("@astrojs/markdown-satteri", () => ({
				satteri: vi.fn((o: unknown) => ({ name: "satteri", options: o })),
				isSatteriProcessor: vi.fn(() => true),
			}));

			const updateConfig = vi.fn();
			const injectRoute = vi.fn();
			const integration = lilypond();
			await integration.hooks["astro:config:setup"]?.({
				command,
				config: baseConfig({
					markdown: { processor: { name: "satteri", options: {} } },
				}),
				updateConfig,
				injectRoute,
				logger: { info: vi.fn(), warn: vi.fn() },
			} as never);
			vi.doUnmock("@astrojs/markdown-satteri");

			const { plugins } = (
				updateConfig.mock.calls[0][0] as { vite: { plugins: unknown[] } }
			).vite;
			return { plugins, injectRoute };
		}

		it("injects a dev asset route and sets the dev assets dir env var for `astro dev`", async () => {
			const { plugins, injectRoute } = await setupWithCommand("dev");

			expect(plugins).toHaveLength(1);
			expect(injectRoute).toHaveBeenCalledWith({
				pattern: "/_lilypond/[fileName]",
				entrypoint: expect.any(URL),
				prerender: false,
			});
			expect(process.env[DEV_ASSETS_DIR_ENV]).toBe(
				"/project/node_modules/.astro/astro-lilypond/_lilypond",
			);
		});

		it("resolves the dev assets dir under cacheDir/astro-lilypond/outputDir", async () => {
			vi.doMock("@astrojs/markdown-satteri", () => ({
				satteri: vi.fn((o: unknown) => ({ name: "satteri", options: o })),
				isSatteriProcessor: vi.fn(() => true),
			}));

			const integration = lilypond();
			const logger = { info: vi.fn(), warn: vi.fn() };
			await integration.hooks["astro:config:setup"]?.({
				command: "dev",
				config: baseConfig({
					markdown: { processor: { name: "satteri", options: {} } },
				}),
				updateConfig: vi.fn(),
				injectRoute: vi.fn(),
				logger,
			} as never);
			vi.doUnmock("@astrojs/markdown-satteri");

			await integration.hooks["astro:build:done"]?.({ logger } as never);

			expect(mockPruneOrphanedAssets).toHaveBeenCalledWith(
				expect.objectContaining({
					dir: "/project/node_modules/.astro/astro-lilypond/_lilypond",
				}),
			);
		});

		it("writes into publicDir for `astro build`, without injecting a dev asset route", async () => {
			const { plugins, injectRoute } = await setupWithCommand("build");
			expect(plugins).toHaveLength(1);
			expect(injectRoute).not.toHaveBeenCalled();
		});
	});
});
