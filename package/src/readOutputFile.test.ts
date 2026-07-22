import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("fs/promises")>();
	return {
		...actual,
		readdir: vi.fn(async () => [] as string[]),
		readFile: vi.fn(async () => Buffer.from("<svg>fake</svg>")),
	};
});

import { readdir, readFile } from "node:fs/promises";
import { readOutputFile, safeInputFileName } from "./readOutputFile.js";

const mockReaddir = vi.mocked(readdir);
const mockReadFile = vi.mocked(readFile);

beforeEach(() => {
	vi.clearAllMocks();
	mockReaddir.mockResolvedValue([]);
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

		expect(result).toHaveLength(1);
		expect(result[0].toString()).toBe("<svg>cropped</svg>");
		expect(mockReadFile).toHaveBeenCalledWith("/tmp/output.cropped.svg");
		expect(mockReadFile).toHaveBeenCalledTimes(1);
		expect(mockReaddir).not.toHaveBeenCalled();
	});

	it("throws a descriptive error when the cropped file is missing, with no fallback", async () => {
		mockReadFile.mockRejectedValueOnce(new Error("ENOENT"));

		await expect(readOutputFile("/tmp/output", "svg", true)).rejects.toThrow(
			"expected cropped output at /tmp/output.cropped.svg",
		);
		expect(mockReadFile).toHaveBeenCalledTimes(1);
	});

	it("reads <base>.<format> directly when crop is false and it's the only output", async () => {
		mockReaddir.mockResolvedValue(["output.svg"]);
		mockReadFile.mockResolvedValueOnce(Buffer.from("<svg>page</svg>"));

		const result = await readOutputFile("/tmp/output", "svg", false);

		expect(result).toHaveLength(1);
		expect(result[0].toString()).toBe("<svg>page</svg>");
		expect(mockReadFile).toHaveBeenCalledWith("/tmp/output.svg");
	});

	it("prefers the unsuffixed file even if numbered files are also present", async () => {
		mockReaddir.mockResolvedValue(["output.svg", "output-1.svg"]);
		mockReadFile.mockResolvedValueOnce(Buffer.from("<svg>page</svg>"));

		const result = await readOutputFile("/tmp/output", "svg", false);

		expect(result).toHaveLength(1);
		expect(mockReadFile).toHaveBeenCalledWith("/tmp/output.svg");
		expect(mockReadFile).toHaveBeenCalledTimes(1);
	});

	it("reads every <base>-N.<format> page in numeric order for multi-page svg/pdf", async () => {
		mockReaddir.mockResolvedValue([
			"output-2.svg",
			"output-1.svg",
			"output-10.svg",
			"output-3.svg",
		]);
		mockReadFile.mockImplementation(async (path) => {
			return Buffer.from(`content:${String(path)}`);
		});

		const result = await readOutputFile("/tmp/output", "svg", false);

		expect(result.map((buf) => buf.toString())).toEqual([
			"content:/tmp/output-1.svg",
			"content:/tmp/output-2.svg",
			"content:/tmp/output-3.svg",
			"content:/tmp/output-10.svg",
		]);
	});

	it("reads every <base>-pageN.<format> page in numeric order for multi-page png, named differently than svg/pdf", async () => {
		mockReaddir.mockResolvedValue(["output-page2.png", "output-page1.png"]);
		mockReadFile.mockImplementation(async (path) => {
			return Buffer.from(`content:${String(path)}`);
		});

		const result = await readOutputFile("/tmp/output", "png", false);

		expect(result.map((buf) => buf.toString())).toEqual([
			"content:/tmp/output-page1.png",
			"content:/tmp/output-page2.png",
		]);
	});

	it("throws a clear error when no matching output is found", async () => {
		mockReaddir.mockResolvedValue(["unrelated-file.txt"]);

		await expect(readOutputFile("/tmp/output", "png", false)).rejects.toThrow(
			"no png output found in /tmp",
		);
		expect(mockReadFile).not.toHaveBeenCalled();
	});
});
