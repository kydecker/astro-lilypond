import { describe, expect, it, vi } from "vitest";

vi.mock("./render.js", () => ({
	render: vi.fn().mockRejectedValue(new Error("mock render failure")),
	FORMATS: ["png", "svg"],
	defaultOptions: {
		format: "svg",
		crop: true,
		binaryPath: "lilypond",
		timeout: 60_000,
		defaults: {
			resolution: 144,
			crop: "markdown-only",
		},
	},
}));

vi.mock("./deleteAssets.js", () => ({
	pruneOrphanedAssets: vi.fn(),
	pruneStaleAssets: vi.fn(),
}));

import { pruneOrphanedAssets } from "./deleteAssets.js";
import lilypond from "./index.js";
import { render } from "./render.js";

const mockPruneOrphanedAssets = vi.mocked(pruneOrphanedAssets);
const mockRender = vi.mocked(render);

const FAKE_PUBLIC_DIR = new URL("file:///project/public/");

interface SetupHookArgs {
	command?: "dev" | "build" | "preview" | "sync";
	config: {
		markdown?: {
			processor?: { name: string; options?: Record<string, unknown> };
		};
		publicDir?: URL;
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

		describe("crop", () => {
			it("renders uncropped by default (defaults.crop defaults to markdown-only)", async () => {
				const plugin = await getVitePlugin();
				await plugin.transform("", "score.ly").catch(() => {});
				expect(mockRender.mock.calls.at(-1)?.[1]).toMatchObject({
					crop: false,
				});
			});

			it("renders uncropped when defaults.crop is explicitly false", async () => {
				const plugin = await getVitePlugin({ defaults: { crop: false } });
				await plugin.transform("", "score.ly").catch(() => {});
				expect(mockRender.mock.calls.at(-1)?.[1]).toMatchObject({
					crop: false,
				});
			});

			it("renders cropped by default when defaults.crop is explicitly true", async () => {
				const plugin = await getVitePlugin({ defaults: { crop: true } });
				await plugin.transform("", "score.ly").catch(() => {});
				expect(mockRender.mock.calls.at(-1)?.[1]).toMatchObject({
					crop: true,
				});
			});

			it("forces cropped output when the import has a ?crop query param, overriding defaults.crop", async () => {
				const plugin = await getVitePlugin();
				await plugin.transform("", "score.ly?crop").catch(() => {});
				expect(mockRender.mock.calls.at(-1)?.[1]).toMatchObject({ crop: true });
			});

			it("forces uncropped output when the import has a ?nocrop query param, overriding a defaults.crop of true", async () => {
				const plugin = await getVitePlugin({ defaults: { crop: true } });
				await plugin.transform("", "score.ly?nocrop").catch(() => {});
				expect(mockRender.mock.calls.at(-1)?.[1]).toMatchObject({
					crop: false,
				});
			});

			it("still recognizes the extension when a query string is present", async () => {
				const plugin = await getVitePlugin();
				const skipped = await plugin
					.transform("", "score.ly?crop")
					.catch((err: Error) => err);
				expect(skipped).toBeInstanceOf(Error);
			});

			it("still recognizes the extension when a ?nocrop query string is present", async () => {
				const plugin = await getVitePlugin();
				const skipped = await plugin
					.transform("", "score.ly?nocrop")
					.catch((err: Error) => err);
				expect(skipped).toBeInstanceOf(Error);
			});

			it("leaves ?raw (and other query params it doesn't own) to Vite's built-in handling", async () => {
				const plugin = await getVitePlugin();
				mockRender.mockClear();

				const result = await plugin.transform("", "score.ly?raw");

				expect(result).toBeUndefined();
				expect(mockRender).not.toHaveBeenCalled();
			});

			it("strips the query string before deriving sourceName/includePaths", async () => {
				const plugin = await getVitePlugin();
				await plugin.transform("", "/docs/src/score.ly?crop").catch(() => {});
				const [, options] = mockRender.mock.calls.at(-1) as [
					string,
					{ sourceName?: string; includePaths?: string[] },
				];
				expect(options.sourceName).toBe("score.ly");
				expect(options.includePaths).toEqual(["/docs/src"]);
			});
		});
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
		async function setupWithCommand(command: "dev" | "build") {
			vi.doMock("@astrojs/markdown-satteri", () => ({
				satteri: vi.fn((o: unknown) => ({ name: "satteri", options: o })),
				isSatteriProcessor: vi.fn(() => true),
			}));

			const updateConfig = vi.fn();
			const integration = lilypond();
			await integration.hooks["astro:config:setup"]?.({
				command,
				config: baseConfig({
					markdown: { processor: { name: "satteri", options: {} } },
				}),
				updateConfig,
				logger: { info: vi.fn(), warn: vi.fn() },
			} as never);
			vi.doUnmock("@astrojs/markdown-satteri");

			return { integration, updateConfig };
		}

		it.each(["dev", "build"] as const)(
			"resolves assets under publicDir/outputDir for `astro %s`",
			async (command) => {
				const { integration, updateConfig } = await setupWithCommand(command);
				const logger = { info: vi.fn(), warn: vi.fn() };

				expect(
					(updateConfig.mock.calls[0][0] as { vite: { plugins: unknown[] } })
						.vite.plugins,
				).toHaveLength(1);

				await integration.hooks["astro:build:done"]?.({ logger } as never);

				expect(mockPruneOrphanedAssets).toHaveBeenCalledWith(
					expect.objectContaining({ dir: "/project/public/_lilypond" }),
				);
			},
		);
	});
});
