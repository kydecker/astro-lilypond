import { defineCollection } from "astro:content";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import type { Loader } from "astro/loaders";

function changelogLoader(): Loader {
	return {
		name: "changelog-loader",
		async load({ store, config, renderMarkdown, generateDigest }) {
			const path = fileURLToPath(
				new URL("../package/CHANGELOG.md", config.root),
			);
			const raw = await readFile(path, "utf-8");

			// Drop the leading `# astro-lilypond` heading Changesets generates
			const withoutTitle = raw.replace(/^#\s+.*\n+/, "");

			// Drop the Changesets commit hash prefixing each bullet (e.g. `- b319aa6: `)
			const withoutHashes = withoutTitle.replace(
				/^(-\s+)[0-9a-f]{7,40}:\s+/gm,
				"$1",
			);

			const safe = withoutHashes.replace(
				/^([ \t]*)```(?:lilypond|ly|ily)\b/gm,
				"$1```lilypondtext",
			);

			store.set({
				id: "changelog",
				data: {},
				body: safe,
				rendered: await renderMarkdown(safe),
				digest: generateDigest(safe),
			});
		},
	};
}

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema(),
	}),
	changelog: defineCollection({
		loader: changelogLoader(),
	}),
};
