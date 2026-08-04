import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../render.js", () => ({
	render: vi.fn().mockResolvedValue([Buffer.from("fake-svg")]),
	defaultOptions: {
		format: "svg",
		crop: true,
		binaryPath: "lilypond",
		timeout: 60_000,
		defaults: {
			format: "svg",
			resolution: 144,
			cropScale: 1.5,
		},
	},
}));

vi.mock("../utils/emitLilypondAsset.js", () => ({
	emitLilypondAsset: vi.fn(),
}));

vi.mock("../utils/emitLilypondPdfAsset.js", () => ({
	emitLilypondPdfAsset: vi.fn(),
}));

vi.mock("../binary/index.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../binary/index.js")>();
	return {
		...actual,
		resolveLilypondBinary: vi.fn().mockResolvedValue("lilypond"),
	};
});

import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { resolveLilypondBinary } from "../binary/index.js";
import lilypond, {
	type LilypondScore,
	Score as PublicScore,
	getScore as publicGetScore,
} from "../index.js";
import { render as lowLevelRender } from "../render.js";
import {
	getLilypondState,
	type LilypondState,
	resetLilypondStateForTests,
	setLilypondState,
} from "../state.js";
import { fakeEmitLilypondAsset } from "../utils/__tests__/emitLilypondAsset.fake.js";
import { fakeEmitLilypondPdfAsset } from "../utils/__tests__/emitLilypondPdfAsset.fake.js";
import { emitLilypondAsset } from "../utils/emitLilypondAsset.js";
import { emitLilypondPdfAsset } from "../utils/emitLilypondPdfAsset.js";

const mockLowLevelRender = vi.mocked(lowLevelRender);
const mockEmitLilypondAsset = vi.mocked(emitLilypondAsset);
const mockEmitLilypondPdfAsset = vi.mocked(emitLilypondPdfAsset);
const mockResolveLilypondBinary = vi.mocked(resolveLilypondBinary);

const FAKE_PUBLIC_DIR = new URL("file:///project/public/");
const FAKE_LOGGER = { warn: vi.fn(), error: vi.fn() };

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

function fakeLilypondState(
	overrides: Partial<LilypondState> = {},
): LilypondState {
	return {
		binaryPath: "lilypond",
		defaults: undefined,
		timeout: undefined,
		isDev: false,
		logger: FAKE_LOGGER,
		...overrides,
	};
}

beforeEach(() => {
	resetLilypondStateForTests();
	mockLowLevelRender.mockClear();
	mockEmitLilypondAsset.mockClear();
	mockEmitLilypondPdfAsset.mockClear();
	fakeEmitLilypondAsset(mockEmitLilypondAsset);
	fakeEmitLilypondPdfAsset(mockEmitLilypondPdfAsset);
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

	it("forwards resolveLilypondBinary's log/warn callbacks to the integration logger", async () => {
		vi.doMock("@astrojs/markdown-satteri", () => ({
			satteri: vi.fn((o: unknown) => ({ name: "satteri", options: o })),
			isSatteriProcessor: vi.fn(() => true),
		}));

		const logger = { info: vi.fn(), warn: vi.fn() };
		const integration = lilypond();
		await integration.hooks["astro:config:setup"]?.({
			command: "build",
			config: baseConfig({
				markdown: { processor: { name: "satteri", options: {} } },
			}),
			updateConfig: vi.fn(),
			logger,
		} as never);
		vi.doUnmock("@astrojs/markdown-satteri");

		const { log, warn } = mockResolveLilypondBinary.mock.calls[0][0] as {
			log: (message: string) => void;
			warn: (message: string) => void;
		};
		log("downloading...");
		warn("not found on PATH");
		expect(logger.info).toHaveBeenCalledWith("downloading...");
		expect(logger.warn).toHaveBeenCalledWith("not found on PATH");
	});

	it("populates state with the resolved binary path, so the public getScore() can reach it", async () => {
		mockResolveLilypondBinary.mockResolvedValue(
			"/cache/lilypond-2.26.0/bin/lilypond",
		);
		vi.doMock("@astrojs/markdown-satteri", () => ({
			satteri: vi.fn((o: unknown) => ({ name: "satteri", options: o })),
			isSatteriProcessor: vi.fn(() => true),
		}));

		const integration = lilypond();
		await integration.hooks["astro:config:setup"]?.({
			command: "build",
			config: baseConfig({
				markdown: { processor: { name: "satteri", options: {} } },
			}),
			updateConfig: vi.fn(),
			logger: { info: vi.fn(), warn: vi.fn() },
		} as never);
		vi.doUnmock("@astrojs/markdown-satteri");

		expect(getLilypondState().binaryPath).toBe(
			"/cache/lilypond-2.26.0/bin/lilypond",
		);
	});

	it.each([
		["dev", true],
		["build", false],
		["preview", false],
		["sync", false],
	] as const)(
		'command: "%s" sets state.isDev to %s',
		async (command, expectedIsDev) => {
			vi.doMock("@astrojs/markdown-satteri", () => ({
				satteri: vi.fn((o: unknown) => ({ name: "satteri", options: o })),
				isSatteriProcessor: vi.fn(() => true),
			}));

			const integration = lilypond();
			await integration.hooks["astro:config:setup"]?.({
				command,
				config: baseConfig({
					markdown: { processor: { name: "satteri", options: {} } },
				}),
				updateConfig: vi.fn(),
				logger: { info: vi.fn(), warn: vi.fn() },
			} as never);
			vi.doUnmock("@astrojs/markdown-satteri");

			expect(getLilypondState().isDev).toBe(expectedIsDev);
		},
	);

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

		function scoreFrom(result: { code: string } | undefined): LilypondScore {
			const match = /export default (.*)$/.exec(result?.code ?? "");
			return JSON.parse(match?.[1] ?? "{}") as LilypondScore;
		}

		it("skips unrecognized extensions", async () => {
			const plugin = await getVitePlugin();
			const skipped = await plugin.transform("", "score.txt");
			expect(skipped).toBeUndefined();
		});

		it("skips any id carrying a query string — nothing is recognized anymore, so ?raw/?url/etc. fall through to Vite's built-in handling", async () => {
			const plugin = await getVitePlugin();
			for (const suffix of ["?raw", "?url", "?crop", "?anything"]) {
				mockLowLevelRender.mockClear();
				mockEmitLilypondAsset.mockClear();
				const skipped = await plugin.transform("", `score.ly${suffix}`);
				expect(skipped).toBeUndefined();
				expect(mockLowLevelRender).not.toHaveBeenCalled();
				expect(mockEmitLilypondAsset).not.toHaveBeenCalled();
			}
		});

		it.each([".ly", ".lilypond", ".ily"])(
			"transforms %s files into a LilypondScore handle, without invoking render() or emitLilypondAsset()",
			async (ext) => {
				mockLowLevelRender.mockClear();
				mockEmitLilypondAsset.mockClear();
				const plugin = await getVitePlugin();
				const result = await plugin.transform("\\score { }", `score${ext}`);
				const score = scoreFrom(result);
				expect(score.source).toEqual(expect.any(String));
				expect(mockLowLevelRender).not.toHaveBeenCalled();
				expect(mockEmitLilypondAsset).not.toHaveBeenCalled();
			},
		);

		it("prepends \\version when defaults.version is set", async () => {
			const plugin = await getVitePlugin({ defaults: { version: "2.26.0" } });
			const result = await plugin.transform("\\score { }", "score.ly");
			const score = scoreFrom(result);
			expect(score.source).toBe('\\version "2.26.0"\n\\score { }');
		});

		it("derives sourceName/includePaths from the id", async () => {
			const plugin = await getVitePlugin();
			const result = await plugin.transform(
				"\\score { }",
				"/docs/src/score.ly",
			);
			const score = scoreFrom(result);
			expect(score.sourceName).toBe("score.ly");
			expect(score.includePaths).toEqual(["/docs/src"]);
		});

		describe("alt text", () => {
			async function transformContent(source: string) {
				const plugin = await getVitePlugin();
				const result = await plugin.transform(source, "score.ly");
				return scoreFrom(result);
			}

			it("derives alt text from the .ly file's \\header title/composer", async () => {
				const score = await transformContent(
					'\\header { title = "Sonata" composer = "Beethoven" }',
				);
				expect(score.alt).toBe("Sonata, by Beethoven");
			});

			it("is an empty string when the .ly file has no \\header", async () => {
				const score = await transformContent("\\score { }");
				expect(score.alt).toBe("");
			});
		});

		describe("meta", () => {
			async function transformContent(source: string) {
				const plugin = await getVitePlugin();
				const result = await plugin.transform(source, "score.ly");
				return scoreFrom(result);
			}

			it("parses standard and non-standard \\header fields into meta, same as a collection entry", async () => {
				const score = await transformContent(
					'\\header { title = "Sonata" composer = "Beethoven" mutopiacomposer = "BeethovenLV" }',
				);
				expect(score.meta).toMatchObject({
					title: "Sonata",
					composer: "Beethoven",
					mutopiacomposer: "BeethovenLV",
				});
			});

			it("is an empty object when the .ly file has no \\header", async () => {
				const score = await transformContent("\\score { }");
				expect(score.meta).toEqual({});
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

	it("defaults to an empty options object when the satteri processor reports none", async () => {
		const updateConfig = vi.fn();
		const logger = { info: vi.fn(), warn: vi.fn() };

		vi.doMock("@astrojs/markdown-satteri", () => ({
			satteri: vi.fn((opts: unknown) => ({ name: "satteri", options: opts })),
			isSatteriProcessor: vi.fn(() => true),
		}));

		const config = baseConfig({
			markdown: { processor: { name: "satteri" } },
		});

		const integration = lilypond();
		await integration.hooks["astro:config:setup"]?.({
			command: "build",
			config,
			updateConfig,
			logger,
		} as never);

		const { mdastPlugins } = (
			updateConfig.mock.calls[1][0] as {
				markdown: { processor: { options: { mdastPlugins: unknown[] } } };
			}
		).markdown.processor.options;
		expect(mdastPlugins).toHaveLength(1);

		vi.doUnmock("@astrojs/markdown-satteri");
	});

	it("registers remark plugin when processor is unified", async () => {
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
		const { remarkPlugins } = (
			updateConfig.mock.calls[1][0] as {
				markdown: { processor: { options: { remarkPlugins: unknown[] } } };
			}
		).markdown.processor.options;
		expect(remarkPlugins.length).toBeGreaterThan(0);

		vi.doUnmock("@astrojs/markdown-remark");
	});

	it("defaults to an empty options object when the unified processor reports none", async () => {
		const updateConfig = vi.fn();
		const logger = { info: vi.fn(), warn: vi.fn() };

		vi.doMock("@astrojs/markdown-remark", () => ({
			unified: vi.fn((opts: unknown) => ({ name: "unified", options: opts })),
			isUnifiedProcessor: vi.fn(() => true),
		}));

		const config = baseConfig({
			markdown: { processor: { name: "unified" } },
		});

		const integration = lilypond();
		await integration.hooks["astro:config:setup"]?.({
			command: "build",
			config,
			updateConfig,
			logger,
		} as never);

		const { remarkPlugins } = (
			updateConfig.mock.calls[1][0] as {
				markdown: { processor: { options: { remarkPlugins: unknown[] } } };
			}
		).markdown.processor.options;
		expect(remarkPlugins).toHaveLength(1);

		vi.doUnmock("@astrojs/markdown-remark");
	});

	it('throws when the processor reports name "satteri" but fails the isSatteriProcessor check', async () => {
		const updateConfig = vi.fn();
		const logger = { info: vi.fn(), warn: vi.fn() };

		vi.doMock("@astrojs/markdown-satteri", () => ({
			satteri: vi.fn((opts: unknown) => ({ name: "satteri", options: opts })),
			isSatteriProcessor: vi.fn(() => false),
		}));

		const config = baseConfig({
			markdown: { processor: { name: "satteri", options: {} } },
		});

		const integration = lilypond();
		await expect(
			integration.hooks["astro:config:setup"]?.({
				command: "build",
				config,
				updateConfig,
				logger,
			} as never),
		).rejects.toThrow("failed the isSatteriProcessor check");

		vi.doUnmock("@astrojs/markdown-satteri");
	});

	it('throws when the processor reports name "unified" but fails the isUnifiedProcessor check', async () => {
		const updateConfig = vi.fn();
		const logger = { info: vi.fn(), warn: vi.fn() };

		vi.doMock("@astrojs/markdown-remark", () => ({
			unified: vi.fn((opts: unknown) => ({ name: "unified", options: opts })),
			isUnifiedProcessor: vi.fn(() => false),
		}));

		const config = baseConfig({
			markdown: { processor: { name: "unified", options: {} } },
		});

		const integration = lilypond();
		await expect(
			integration.hooks["astro:config:setup"]?.({
				command: "build",
				config,
				updateConfig,
				logger,
			} as never),
		).rejects.toThrow("failed the isUnifiedProcessor check");

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

	it("injected types declare a bare module for .ly, .lilypond, and .ily, with no query-string variants", () => {
		const injectTypes = vi.fn();
		const integration = lilypond();
		integration.hooks["astro:config:done"]?.({ injectTypes } as never);
		const { content } = injectTypes.mock.calls[0][0] as { content: string };
		for (const ext of [".ly", ".lilypond", ".ily"]) {
			expect(content).toContain(`declare module "*${ext}"`);
		}
		expect(content).not.toContain("?");
	});

	it("injected type declarations export a default LilypondScore value", () => {
		const injectTypes = vi.fn();
		const integration = lilypond();
		integration.hooks["astro:config:done"]?.({ injectTypes } as never);
		const { content } = injectTypes.mock.calls[0][0] as { content: string };
		expect(content.match(/export default score/g)?.length).toBe(3);
		expect(content.match(/LilypondScore/g)?.length).toBe(3);
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

describe("getScore()", () => {
	const SCORE: LilypondScore = {
		source: "\\score { }",
		alt: "Sonata, by Beethoven",
		sourceName: "score.ly",
		includePaths: ["/docs/src"],
		assetTitle: "score",
		meta: { title: "Sonata", composer: "Beethoven" },
	};

	beforeEach(() => {
		setLilypondState(fakeLilypondState());
	});

	it("always returns a Score component, defaulting to svg", async () => {
		const { Score } = await publicGetScore(SCORE);
		expect(Score.isAstroComponentFactory).toBe(true);
		expect(mockEmitLilypondAsset.mock.calls[0][0]).toMatchObject({
			format: "svg",
		});
	});

	it("passes the score's meta straight through, alongside Score", async () => {
		const { meta } = await publicGetScore(SCORE);
		expect(meta).toEqual(SCORE.meta);
	});

	it("returns the score's source as raw, alongside Score", async () => {
		const { raw } = await publicGetScore(SCORE);
		expect(raw).toBe(SCORE.source);
	});

	it("returns pages alongside Score", async () => {
		mockEmitLilypondAsset.mockResolvedValueOnce([
			{ src: "/_astro/a.svg" },
			{ src: "/_astro/b.svg" },
		]);
		const { pages } = await publicGetScore(SCORE);
		expect(pages).toEqual([{ src: "/_astro/a.svg" }, { src: "/_astro/b.svg" }]);
	});

	it("renders Score to the expected <img> markup", async () => {
		mockEmitLilypondAsset.mockResolvedValueOnce([{ src: "/_astro/a.svg" }]);
		const { Score } = await publicGetScore(SCORE);
		const container = await AstroContainer.create();
		const html = await container.renderToString(Score, { props: {} });
		expect(html).toContain('src="/_astro/a.svg"');
		expect(html).toContain("data-lilypond-image");
		expect(html).toContain(`alt="${SCORE.alt}"`);
	});

	it("falls back to an empty alt when neither the score nor the props provide one", async () => {
		mockEmitLilypondAsset.mockResolvedValueOnce([{ src: "/_astro/a.svg" }]);
		const { Score } = await publicGetScore({
			...SCORE,
			alt: undefined as unknown as string,
		});
		const container = await AstroContainer.create();
		const html = await container.renderToString(Score, { props: {} });
		expect(html).toContain('src="/_astro/a.svg"');
		expect(html).not.toContain(SCORE.alt);
	});

	it("forwards props like class through Score to the rendered markup", async () => {
		mockEmitLilypondAsset.mockResolvedValueOnce([{ src: "/_astro/a.svg" }]);
		const { Score } = await publicGetScore(SCORE);
		const container = await AstroContainer.create();
		const html = await container.renderToString(Score, {
			props: { class: "extra" },
		});
		expect(html).toContain('class="extra"');
	});

	it("forwards style through Score to the rendered markup", async () => {
		mockEmitLilypondAsset.mockResolvedValueOnce([{ src: "/_astro/a.svg" }]);
		const { Score } = await publicGetScore(SCORE);
		const container = await AstroContainer.create();
		const html = await container.renderToString(Score, {
			props: { style: "width: 50%" },
		});
		expect(html).toContain('style="width: 50%"');
	});

	it("renders multiple pages as an <ol data-lilypond-group> of <li><img>s", async () => {
		mockEmitLilypondAsset.mockResolvedValueOnce([
			{ src: "/_astro/a.svg" },
			{ src: "/_astro/b.svg" },
		]);
		const { Score } = await publicGetScore(SCORE);
		const container = await AstroContainer.create();
		const html = await container.renderToString(Score, { props: {} });
		expect(html).toContain("data-lilypond-group");
		expect(html).toContain('src="/_astro/a.svg"');
		expect(html).toContain('src="/_astro/b.svg"');
	});

	it("forwards pageLimit through Score, limiting rendered pages", async () => {
		mockEmitLilypondAsset.mockResolvedValueOnce([
			{ src: "/_astro/a.svg" },
			{ src: "/_astro/b.svg" },
		]);
		const { Score } = await publicGetScore(SCORE);
		const container = await AstroContainer.create();
		const html = await container.renderToString(Score, {
			props: { pageLimit: 1 },
		});
		expect(html).toContain('src="/_astro/a.svg"');
		expect(html).not.toContain('src="/_astro/b.svg"');
	});

	it("uses the requested format", async () => {
		await publicGetScore(SCORE, { format: "png" });
		expect(mockEmitLilypondAsset.mock.calls[0][0]).toMatchObject({
			format: "png",
		});
	});

	it("omits pdf from the result when not requested", async () => {
		const result = await publicGetScore(SCORE);
		expect(result.pdf).toBeUndefined();
		expect(mockEmitLilypondPdfAsset).not.toHaveBeenCalled();
	});

	it("includes a pdf result when requested, alongside Score, rendered concurrently", async () => {
		const { Score, pdf } = await publicGetScore(SCORE, { pdf: true });
		expect(Score.isAstroComponentFactory).toBe(true);
		expect(pdf?.src).toEqual(expect.any(String));
		expect(mockEmitLilypondAsset).toHaveBeenCalledTimes(1);
		expect(mockEmitLilypondPdfAsset).toHaveBeenCalledTimes(1);
	});

	it("always renders the pdf uncropped, regardless of defaults.crop", async () => {
		await publicGetScore(SCORE, { pdf: true });
		const { render: renderThunk } = mockEmitLilypondPdfAsset.mock.calls[0][0];
		mockLowLevelRender.mockClear();
		await renderThunk();
		expect(mockLowLevelRender.mock.calls.at(-1)?.[1]).toMatchObject({
			format: "pdf",
			crop: false,
		});
	});

	it("honors an explicit crop:true override", async () => {
		await publicGetScore(SCORE, { crop: true });
		expect(mockEmitLilypondAsset.mock.calls[0][0]).toMatchObject({
			crop: true,
		});
	});

	it("throws a clear, actionable error when the lilypond() integration hasn't run", async () => {
		resetLilypondStateForTests();
		await expect(publicGetScore(SCORE)).rejects.toThrow(
			/lilypond\(\).*Astro config/s,
		);
	});

	it("still throws a render failure when isDev is false", async () => {
		mockEmitLilypondAsset.mockRejectedValueOnce(
			new Error("fatal error: bad input"),
		);
		await expect(publicGetScore(SCORE)).rejects.toThrow(
			"fatal error: bad input",
		);
	});

	it("renders an inline error Score instead of throwing when isDev is true", async () => {
		setLilypondState(fakeLilypondState({ isDev: true }));
		mockEmitLilypondAsset.mockRejectedValueOnce(
			new Error("fatal error: bad input"),
		);

		const { Score, pages, pdf } = await publicGetScore(SCORE);
		expect(pages).toEqual([]);
		expect(pdf).toBeUndefined();

		const container = await AstroContainer.create();
		const html = await container.renderToString(Score, { props: {} });
		expect(html).toContain("fatal error: bad input");
	});
});

describe("Score component", () => {
	const SCORE: LilypondScore = {
		source: "\\score { }",
		alt: "Sonata, by Beethoven",
		sourceName: "score.ly",
		includePaths: ["/docs/src"],
		assetTitle: "score",
		meta: { title: "Sonata", composer: "Beethoven" },
	};

	beforeEach(() => {
		setLilypondState(fakeLilypondState());
	});

	it("renders an <img> directly from content, with no render() call needed", async () => {
		mockEmitLilypondAsset.mockResolvedValueOnce([{ src: "/_astro/a.svg" }]);
		const container = await AstroContainer.create();
		const html = await container.renderToString(PublicScore, {
			props: { content: SCORE },
		});
		expect(html).toContain('src="/_astro/a.svg"');
		expect(html).toContain("data-lilypond-image");
		expect(html).toContain(`alt="${SCORE.alt}"`);
	});

	it("defaults to svg, uncropped", async () => {
		const container = await AstroContainer.create();
		await container.renderToString(PublicScore, { props: { content: SCORE } });
		expect(mockEmitLilypondAsset.mock.calls[0][0]).toMatchObject({
			format: "svg",
			crop: false,
		});
	});

	it("honors explicit format and crop props", async () => {
		const container = await AstroContainer.create();
		await container.renderToString(PublicScore, {
			props: { content: SCORE, format: "png", crop: true },
		});
		expect(mockEmitLilypondAsset.mock.calls[0][0]).toMatchObject({
			format: "png",
			crop: true,
		});
	});

	it("falls back to an empty alt when neither content nor props provide one", async () => {
		mockEmitLilypondAsset.mockResolvedValueOnce([{ src: "/_astro/a.svg" }]);
		const container = await AstroContainer.create();
		const html = await container.renderToString(PublicScore, {
			props: { content: { ...SCORE, alt: undefined as unknown as string } },
		});
		expect(html).toContain('src="/_astro/a.svg"');
		expect(html).not.toContain(SCORE.alt);
	});

	it("prefers an explicit alt prop over content's alt", async () => {
		mockEmitLilypondAsset.mockResolvedValueOnce([{ src: "/_astro/a.svg" }]);
		const container = await AstroContainer.create();
		const html = await container.renderToString(PublicScore, {
			props: { content: SCORE, alt: "Custom alt" },
		});
		expect(html).toContain('alt="Custom alt"');
		expect(html).not.toContain(SCORE.alt);
	});

	it("forwards class and style to the rendered markup", async () => {
		mockEmitLilypondAsset.mockResolvedValueOnce([{ src: "/_astro/a.svg" }]);
		const container = await AstroContainer.create();
		const html = await container.renderToString(PublicScore, {
			props: { content: SCORE, class: "extra", style: "width: 50%" },
		});
		expect(html).toContain('class="extra"');
		expect(html).toContain('style="width: 50%"');
	});

	it("renders multiple pages as an <ol data-lilypond-group> of <li><img>s", async () => {
		mockEmitLilypondAsset.mockResolvedValueOnce([
			{ src: "/_astro/a.svg" },
			{ src: "/_astro/b.svg" },
		]);
		const container = await AstroContainer.create();
		const html = await container.renderToString(PublicScore, {
			props: { content: SCORE },
		});
		expect(html).toContain("data-lilypond-group");
		expect(html).toContain('src="/_astro/a.svg"');
		expect(html).toContain('src="/_astro/b.svg"');
	});

	it("forwards pageLimit through, limiting rendered pages", async () => {
		mockEmitLilypondAsset.mockResolvedValueOnce([
			{ src: "/_astro/a.svg" },
			{ src: "/_astro/b.svg" },
		]);
		const container = await AstroContainer.create();
		const html = await container.renderToString(PublicScore, {
			props: { content: SCORE, pageLimit: 1 },
		});
		expect(html).toContain('src="/_astro/a.svg"');
		expect(html).not.toContain('src="/_astro/b.svg"');
	});

	it("throws the same actionable error as getScore() when the lilypond() integration hasn't run", async () => {
		resetLilypondStateForTests();
		const container = await AstroContainer.create();
		await expect(
			container.renderToString(PublicScore, { props: { content: SCORE } }),
		).rejects.toThrow(/lilypond\(\).*Astro config/s);
	});

	it("still throws a render failure when isDev is false", async () => {
		mockEmitLilypondAsset.mockRejectedValueOnce(
			new Error("fatal error: bad input"),
		);
		const container = await AstroContainer.create();
		await expect(
			container.renderToString(PublicScore, { props: { content: SCORE } }),
		).rejects.toThrow("fatal error: bad input");
	});

	it("renders an inline error instead of throwing when isDev is true, ignoring props like class", async () => {
		setLilypondState(fakeLilypondState({ isDev: true }));
		mockEmitLilypondAsset.mockRejectedValueOnce(
			new Error("fatal error: bad input"),
		);

		const container = await AstroContainer.create();
		const html = await container.renderToString(PublicScore, {
			props: { content: SCORE, class: "extra" },
		});
		expect(html).toContain("fatal error: bad input");
		expect(html).not.toContain('class="extra"');
	});
});
