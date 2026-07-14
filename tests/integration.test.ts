import { describe, it, expect, vi } from "vitest";
import lilypond from "../src/index.js";

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

		expect(updateConfig).toHaveBeenCalledOnce();
		expect(
			(updateConfig.mock.calls[0][0] as { markdown?: { processor?: unknown } })
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

		expect(updateConfig).toHaveBeenCalledOnce();
		const { remarkPlugins, rehypePlugins } = (
			updateConfig.mock.calls[0][0] as {
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
