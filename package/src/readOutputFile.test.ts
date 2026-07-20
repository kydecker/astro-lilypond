import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("fs/promises")>();
	return {
		...actual,
		readFile: vi.fn(async () => Buffer.from("<svg>fake</svg>")),
	};
});

import { readFile } from "node:fs/promises";
import { readOutputFile, safeInputFileName } from "./readOutputFile.js";

const mockReadFile = vi.mocked(readFile);

beforeEach(() => {
	vi.clearAllMocks();
	mockReadFile.mockResolvedValue(Buffer.from("<svg>fake</svg>"));
});

describe("safeInputFileName", () => {
	it("returns 'input.ly' when sourceName is undefined", () => {
		expect(safeInputFileName(undefined)).toBe("input.ly");
	});

	it("returns 'input.ly' for an empty string", () => {
		expect(safeInputFileName("")).toBe("input.ly");
	});

	it("returns 'input.ly' when the basename is '.'", () => {
		expect(safeInputFileName(".")).toBe("input.ly");
	});

	it("returns 'input.ly' when the basename is '..'", () => {
		expect(safeInputFileName("..")).toBe("input.ly");
	});

	it("returns 'input.ly' when the basename contains unsafe characters", () => {
		expect(safeInputFileName("bach schenker.ly")).toBe("input.ly");
		expect(safeInputFileName("bach$schenker.ly")).toBe("input.ly");
	});

	it("strips directory components and returns the safe basename", () => {
		expect(safeInputFileName("/docs/src/examples/bach-schenker.ly")).toBe(
			"bach-schenker.ly",
		);
	});

	it("returns the name unchanged when it's already a safe bare filename", () => {
		expect(safeInputFileName("bach-schenker.ly")).toBe("bach-schenker.ly");
	});
});

describe("readOutputFile", () => {
	it("reads <base>.cropped.<format> when crop is true", async () => {
		mockReadFile.mockResolvedValueOnce(Buffer.from("<svg>cropped</svg>"));

		const result = await readOutputFile("/tmp/output", "svg", true);

		expect(result.toString()).toBe("<svg>cropped</svg>");
		expect(mockReadFile).toHaveBeenCalledWith("/tmp/output.cropped.svg");
		expect(mockReadFile).toHaveBeenCalledTimes(1);
	});

	it("throws a descriptive error when the cropped file is missing, with no fallback", async () => {
		mockReadFile.mockRejectedValueOnce(new Error("ENOENT"));

		await expect(readOutputFile("/tmp/output", "svg", true)).rejects.toThrow(
			"expected cropped output at /tmp/output.cropped.svg",
		);
		expect(mockReadFile).toHaveBeenCalledTimes(1);
	});

	it("reads <base>.<format> directly when crop is false and it exists", async () => {
		mockReadFile.mockResolvedValueOnce(Buffer.from("<svg>page</svg>"));

		const result = await readOutputFile("/tmp/output", "svg", false);

		expect(result.toString()).toBe("<svg>page</svg>");
		expect(mockReadFile).toHaveBeenCalledWith("/tmp/output.svg");
		expect(mockReadFile).toHaveBeenCalledTimes(1);
	});

	it("falls back to <base>-1.<format> when the direct read fails", async () => {
		mockReadFile
			.mockRejectedValueOnce(new Error("ENOENT"))
			.mockResolvedValueOnce(Buffer.from("<svg>page1</svg>"));

		const result = await readOutputFile("/tmp/output", "svg", false);

		expect(result.toString()).toBe("<svg>page1</svg>");
		expect(mockReadFile).toHaveBeenNthCalledWith(1, "/tmp/output.svg");
		expect(mockReadFile).toHaveBeenNthCalledWith(2, "/tmp/output-1.svg");
		expect(mockReadFile).toHaveBeenCalledTimes(2);
	});

	it("falls back to <base>-page1.<format> for multi-page PNG, named differently than svg/pdf", async () => {
		mockReadFile
			.mockRejectedValueOnce(new Error("ENOENT")) // output.png
			.mockRejectedValueOnce(new Error("ENOENT")) // output-1.png
			.mockResolvedValueOnce(Buffer.from("fake-png-page1"));

		const result = await readOutputFile("/tmp/output", "png", false);

		expect(result.toString()).toBe("fake-png-page1");
		expect(mockReadFile).toHaveBeenNthCalledWith(1, "/tmp/output.png");
		expect(mockReadFile).toHaveBeenNthCalledWith(2, "/tmp/output-1.png");
		expect(mockReadFile).toHaveBeenNthCalledWith(3, "/tmp/output-page1.png");
		expect(mockReadFile).toHaveBeenCalledTimes(3);
	});

	it("propagates the final rejection when every fallback fails", async () => {
		mockReadFile.mockRejectedValue(new Error("ENOENT"));

		await expect(readOutputFile("/tmp/output", "png", false)).rejects.toThrow(
			"ENOENT",
		);
		expect(mockReadFile).toHaveBeenCalledTimes(3);
	});
});
