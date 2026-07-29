import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./render.js", () => ({
	render: vi.fn().mockRejectedValue(new Error("mock render failure")),
	FORMATS: ["png", "svg"],
	resolveCrop: (cropSetting: unknown, context: "markdown" | "component") =>
		context === "markdown" ? cropSetting !== false : cropSetting === true,
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

vi.mock("./utils/emitLilypondAsset.js", () => ({
	emitLilypondAsset: vi.fn(),
}));

vi.mock("./binary/index.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./binary/index.js")>();
	return {
		...actual,
		resolveLilypondBinary: vi.fn().mockResolvedValue("lilypond"),
	};
});

import { resolveLilypondBinary } from "./binary/index.js";
import lilypond from "./index.js";
import { render } from "./render.js";
import { fakeEmitLilypondAsset } from "./utils/emitLilypondAsset.fake.js";
import { emitLilypondAsset } from "./utils/emitLilypondAsset.js";

const mockRender = vi.mocked(render);
const mockEmitLilypondAsset = vi.mocked(emitLilypondAsset);
const mockResolveLilypondBinary = vi.mocked(resolveLilypondBinary);

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

beforeEach(() => {
	fakeEmitLilypondAsset(mockEmitLilypondAsset);
	mockResolveLilypondBinary.mockReset().mockResolvedValue("lilypond");
});

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

	it("resolves the lilypond binary with the configured autoInstall.version, defaulting autoInstall to true", async () => {
		vi.doMock("@astrojs/markdown-satteri", () => ({
			satteri: vi.fn((o: unknown) => ({ name: "satteri", options: o })),
			isSatteriProcessor: vi.fn(() => true),
		}));

		const integration = lilypond({ autoInstall: { version: "2.24.4" } });
		await integration.hooks["astro:config:setup"]?.({
			command: "build",
			config: baseConfig({
				markdown: { processor: { name: "satteri", options: {} } },
			}),
			updateConfig: vi.fn(),
			logger: { info: vi.fn(), warn: vi.fn() },
		} as never);
		vi.doUnmock("@astrojs/markdown-satteri");

		expect(mockResolveLilypondBinary).toHaveBeenCalledWith(
			expect.objectContaining({ version: "2.24.4", autoInstall: true }),
		);
	});

	it("does not derive the download version from defaults.version", async () => {
		vi.doMock("@astrojs/markdown-satteri", () => ({
			satteri: vi.fn((o: unknown) => ({ name: "satteri", options: o })),
			isSatteriProcessor: vi.fn(() => true),
		}));

		const integration = lilypond({ defaults: { version: "2.24.4" } });
		await integration.hooks["astro:config:setup"]?.({
			command: "build",
			config: baseConfig({
				markdown: { processor: { name: "satteri", options: {} } },
			}),
			updateConfig: vi.fn(),
			logger: { info: vi.fn(), warn: vi.fn() },
		} as never);
		vi.doUnmock("@astrojs/markdown-satteri");

		expect(mockResolveLilypondBinary).toHaveBeenCalledWith(
			expect.objectContaining({ version: undefined }),
		);
	});

	it("respects autoInstall: false", async () => {
		vi.doMock("@astrojs/markdown-satteri", () => ({
			satteri: vi.fn((o: unknown) => ({ name: "satteri", options: o })),
			isSatteriProcessor: vi.fn(() => true),
		}));

		const integration = lilypond({ autoInstall: false });
		await integration.hooks["astro:config:setup"]?.({
			command: "build",
			config: baseConfig({
				markdown: { processor: { name: "satteri", options: {} } },
			}),
			updateConfig: vi.fn(),
			logger: { info: vi.fn(), warn: vi.fn() },
		} as never);
		vi.doUnmock("@astrojs/markdown-satteri");

		expect(mockResolveLilypondBinary).toHaveBeenCalledWith(
			expect.objectContaining({ autoInstall: false }),
		);
	});

	it("threads the resolved binary path through to render()", async () => {
		mockResolveLilypondBinary.mockResolvedValue(
			"/cache/lilypond-2.26.0/bin/lilypond",
		);
		vi.doMock("@astrojs/markdown-satteri", () => ({
			satteri: vi.fn((o: unknown) => ({ name: "satteri", options: o })),
			isSatteriProcessor: vi.fn(() => true),
		}));

		const updateConfig = vi.fn();
		const integration = lilypond();
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
		const plugin = plugins[0] as {
			transform: (src: string, id: string) => Promise<unknown>;
		};
		await plugin.transform("", "score.ly").catch(() => {});

		expect(mockRender.mock.calls.at(-1)?.[1]).toMatchObject({
			binaryPath: "/cache/lilypond-2.26.0/bin/lilypond",
		});
	});

	it("registers the astro-emit-asset integration and the .ly vite plugin", async () => {
		vi.doMock("@astrojs/markdown-satteri", () => ({
			satteri: vi.fn((o: unknown) => ({ name: "satteri", options: o })),
			isSatteriProcessor: vi.fn(() => true),
		}));

		const updateConfig = vi.fn();
		const integration = lilypond();
		await integration.hooks["astro:config:setup"]?.({
			command: "build",
			config: baseConfig({
				markdown: { processor: { name: "satteri", options: {} } },
			}),
			updateConfig,
			logger: { info: vi.fn(), warn: vi.fn() },
		} as never);
		vi.doUnmock("@astrojs/markdown-satteri");

		const firstCall = updateConfig.mock.calls[0][0] as {
			integrations: unknown[];
			vite: { plugins: unknown[] };
		};
		expect(firstCall.integrations).toHaveLength(1);
		expect(firstCall.vite.plugins).toHaveLength(1);
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

		describe("alt text", () => {
			async function transformContent(source: string) {
				const plugin = await getVitePlugin();
				mockRender.mockResolvedValueOnce([Buffer.from("fake-svg")]);
				const result = await plugin.transform(source, "score.ly");
				const match = /export default (.*)$/.exec(result?.code ?? "");
				return JSON.parse(match?.[1] ?? "{}") as {
					pages: { src: string; width?: number; height?: number }[];
					alt?: string;
				};
			}

			it("derives alt text from the .ly file's \\header title/composer", async () => {
				const content = await transformContent(
					'\\header { title = "Sonata" composer = "Beethoven" }',
				);
				expect(content.alt).toBe("Sonata, by Beethoven");
			});

			it("is an empty string when the .ly file has no \\header", async () => {
				const content = await transformContent("\\score { }");
				expect(content.alt).toBe("");
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

	it("injected types declare modules for .ly, .lilypond, and .ily, including their ?crop/?nocrop query variants", () => {
		const injectTypes = vi.fn();
		const integration = lilypond();
		integration.hooks["astro:config:done"]?.({ injectTypes } as never);
		const { content } = injectTypes.mock.calls[0][0] as { content: string };
		for (const ext of [".ly", ".lilypond", ".ily"]) {
			expect(content).toContain(`declare module "*${ext}"`);
			expect(content).toContain(`declare module "*${ext}?crop"`);
			expect(content).toContain(`declare module "*${ext}?nocrop"`);
		}
	});

	it("injected type declarations export a default LilypondContent value", () => {
		const injectTypes = vi.fn();
		const integration = lilypond();
		integration.hooks["astro:config:done"]?.({ injectTypes } as never);
		const { content } = injectTypes.mock.calls[0][0] as { content: string };
		expect(content.match(/export default content/g)?.length).toBe(9);
		expect(content.match(/LilypondContent/g)?.length).toBe(9);
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
});
