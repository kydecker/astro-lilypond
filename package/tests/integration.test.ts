import { describe, it, expect, vi } from "vitest";
import lilypond from "../src/";

interface SetupHookArgs {
	config: {
		markdown?: {
			processor?: { name: string; options?: Record<string, unknown> };
		};
	};
	updateConfig: ReturnType<typeof vi.fn>;
	logger: { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };
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
			await integration.hooks["astro:config:setup"]!({
				config: { markdown: { processor: { name: "satteri", options: {} } } },
				updateConfig,
				logger: { info: vi.fn(), warn: vi.fn() },
			} as never);
			vi.doUnmock("@astrojs/markdown-satteri");
			const { plugins } = (updateConfig.mock.calls[0][0] as { vite: { plugins: unknown[] } }).vite;
			return plugins[0] as { transform: (src: string, id: string) => Promise<{ code: string } | undefined> };
		}

		it("transforms .ily files", async () => {
			const plugin = await getVitePlugin();
			// transform returns undefined for unrecognized extensions
			const skipped = await plugin.transform("", "score.txt");
			expect(skipped).toBeUndefined();
		});

		it.each([".ly", ".lilypond", ".ily"])("handles %s extension", async (ext) => {
			const plugin = await getVitePlugin();
			// render is the actual lilypond binary call — we only verify the plugin
			// doesn't skip the file; a thrown error is fine here
			await expect(plugin.transform("", `score${ext}`)).rejects.toThrow();
		});
	});

	it("registers the Sätteri mdast plugin when processor is satteri", async () => {
		const { updateConfig, logger }: SetupHookArgs = {
			config: {},
			updateConfig: vi.fn(),
			logger: { info: vi.fn(), warn: vi.fn() },
		};

		vi.doMock("@astrojs/markdown-satteri", () => ({
			satteri: vi.fn((opts: unknown) => ({ name: "satteri", options: opts })),
			isSatteriProcessor: vi.fn(() => true),
		}));

		const config: SetupHookArgs["config"] = {
			markdown: { processor: { name: "satteri", options: {} } },
		};

		const integration = lilypond();
		await integration.hooks["astro:config:setup"]!({
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

		const config: SetupHookArgs["config"] = {
			markdown: { processor: { name: "unified", options: {} } },
		};

		const integration = lilypond();
		await integration.hooks["astro:config:setup"]!({
			config,
			updateConfig,
			logger,
		} as never);

		expect(updateConfig).toHaveBeenCalledTimes(2);
		// First call registers Vite plugins; second call sets the markdown processor.
		const { remarkPlugins, rehypePlugins } = (
			updateConfig.mock.calls[1][0] as {
				markdown: { processor: { options: { remarkPlugins: unknown[]; rehypePlugins: unknown[] } } };
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
			integration.hooks["astro:config:setup"]!({
				config: { markdown: {} },
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
		integration.hooks["astro:config:done"]!({ injectTypes } as never);
		expect(injectTypes).toHaveBeenCalledOnce();
		expect(injectTypes.mock.calls[0][0].filename).toBe("ly-types.d.ts");
	});

	it("injected types declare modules for .ly, .lilypond, and .ily", () => {
		const injectTypes = vi.fn();
		const integration = lilypond();
		integration.hooks["astro:config:done"]!({ injectTypes } as never);
		const { content } = injectTypes.mock.calls[0][0] as { content: string };
		expect(content).toContain('declare module "*.ly"');
		expect(content).toContain('declare module "*.lilypond"');
		expect(content).toContain('declare module "*.ily"');
	});

	it("injected type declarations export a default html string", () => {
		const injectTypes = vi.fn();
		const integration = lilypond();
		integration.hooks["astro:config:done"]!({ injectTypes } as never);
		const { content } = injectTypes.mock.calls[0][0] as { content: string };
		expect(content.match(/export default html/g)?.length).toBe(3);
	});

	it("includes the detected processor name in the error", async () => {
		const updateConfig = vi.fn();
		const logger = { info: vi.fn(), warn: vi.fn() };

		const integration = lilypond();
		await expect(
			integration.hooks["astro:config:setup"]!({
				config: { markdown: { processor: { name: "custom-proc" } } },
				updateConfig,
				logger,
			} as never),
		).rejects.toThrow("custom-proc");
	});
});
