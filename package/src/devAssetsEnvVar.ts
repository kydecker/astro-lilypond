/**
 * Env var `index.ts` sets (once, in `astro:config:setup`) and
 * `devAssetEndpoint.ts` reads at request time, to pass `assetsDir` across
 * the module-graph boundary between the integration itself and its
 * injected route (loaded separately, through Vite's SSR module graph).
 */
export const DEV_ASSETS_DIR_ENV = "ASTRO_LILYPOND_DEV_ASSETS_DIR";
