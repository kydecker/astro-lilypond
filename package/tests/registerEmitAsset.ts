import emitAssetIntegration from "astro-emit-asset";

/**
 * Registers `astro-emit-asset`'s own integration exactly as `lilypond()`
 * does via `updateConfig({ integrations: [emitAssetIntegration()] })`, so
 * integration tests exercising `loader.ts`/`index.ts`'s real (unmocked)
 * `emitLilypondAsset()` calls have a working asset pipeline instead of
 * crashing on `globalThis['astro-emit-asset']` being unset.
 */
export async function registerEmitAsset(options: {
	/** Where astro-emit-asset persists its cache — a temp dir per test. */
	cacheDir: URL;
	base?: string;
	/** Matches Astro's `build.assets` config option. @default "_astro" */
	assetsDirName?: string;
}): Promise<{ finalizeBuild: (dir: URL) => Promise<void> }> {
	const integration = emitAssetIntegration();
	await integration.hooks?.["astro:config:setup"]?.({
		command: "build",
		config: {
			build: { assets: options.assetsDirName ?? "_astro" },
			base: options.base ?? "/",
			cacheDir: options.cacheDir,
		},
		updateConfig: () => {},
		logger: {
			info: () => {},
			warn: () => {},
			error: () => {},
			debug: () => {},
		},
	} as never);

	return {
		/** Copies every asset emitted during this test into `dir`, as Astro would at the end of a real build. */
		finalizeBuild: async (dir: URL) => {
			await integration.hooks?.["astro:build:done"]?.({ dir } as never);
		},
	};
}
