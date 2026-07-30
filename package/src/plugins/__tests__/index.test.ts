import { describe, expect, it } from "vitest";
import { rehypePlugin, remarkPlugin, satteriPlugin } from "../index.js";

describe("plugins/index", () => {
	it("re-exports the plugin module's public API", () => {
		expect(typeof rehypePlugin).toBe("function");
		expect(typeof remarkPlugin).toBe("function");
		expect(typeof satteriPlugin).toBe("function");
	});
});
