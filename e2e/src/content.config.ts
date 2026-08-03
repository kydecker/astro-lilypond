import { defineCollection } from "astro:content";
import { lilypondLoader } from "astro-lilypond/loader";

export const collections = {
	scores: defineCollection({
		loader: lilypondLoader({ base: "./src/scores/collection" }),
	}),
};
