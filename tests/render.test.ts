import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("child_process", () => ({
	execFile: vi.fn(
		(
			_bin: string,
			_args: string[],
			cb: (err: null, result: { stdout: string; stderr: string }) => void,
		) => {
			cb(null, { stdout: "", stderr: "" });
		},
	),
}));

vi.mock("fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("fs/promises")>();
	return {
		...actual,
		mkdtemp: vi.fn(async () => "/tmp/astro-lilypond-test"),
		writeFile: vi.fn(async () => {}),
		readFile: vi.fn(async () => Buffer.from("<svg>fake</svg>")),
		rm: vi.fn(async () => {}),
	};
});

import { execFile } from "child_process";
import { readFile } from "fs/promises";
import { render, defaultOptions } from "../src/render.js";

const mockExecFile = vi.mocked(execFile);
const mockReadFile = vi.mocked(readFile);

beforeEach(() => {
	vi.clearAllMocks();
	mockExecFile.mockImplementation(
		((_bin: string, _args: string[], cb: (err: null, res: { stdout: string; stderr: string }) => void) =>
			cb(null, { stdout: "", stderr: "" })) as typeof execFile,
	);
	mockReadFile.mockResolvedValue(Buffer.from("<svg>fake</svg>"));
});

describe("render", () => {
	it("resolves to a Buffer", async () => {
		const result = await render("\\score { }");
		expect(Buffer.isBuffer(result)).toBe(true);
	});

	it("passes --svg flag for svg format", async () => {
		await render("\\score { }", { format: "svg" });
		const [, args] = mockExecFile.mock.calls[0] as unknown as [string, string[]];
		expect(args).toContain("--svg");
	});

	it("passes --define-default crop when crop is true", async () => {
		await render("\\score { }", { crop: true });
		const [, args] = mockExecFile.mock.calls[0] as unknown as [string, string[]];
		const cropIdx = args.indexOf("crop");
		expect(cropIdx).toBeGreaterThan(-1);
		expect(args[cropIdx - 1]).toBe("--define-default");
	});

	it("omits crop args when crop is false", async () => {
		await render("\\score { }", { crop: false });
		const [, args] = mockExecFile.mock.calls[0] as unknown as [string, string[]];
		expect(args).not.toContain("crop");
	});

	it("crop is true by default", () => {
		expect(defaultOptions.crop).toBe(true);
	});

	it("throws when format is unsupported", async () => {
		await expect(
			// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
			render("\\score { }", { format: "docx" as any }),
		).rejects.toThrow("docx is not a supported format");
	});

	it("throws when lilypond reports an error on stderr", async () => {
		mockExecFile.mockImplementation(
			((_bin: string, _args: string[], cb: (err: null, res: { stdout: string; stderr: string }) => void) =>
				cb(null, { stdout: "", stderr: "fatal error: bad input" })) as typeof execFile,
		);
		await expect(render("bad")).rejects.toThrow("fatal error: bad input");
	});

	it("uses a custom binaryPath when provided", async () => {
		await render("\\score { }", { binaryPath: "/usr/local/bin/lilypond" });
		const [bin] = mockExecFile.mock.calls[0] as unknown as [string, string[]];
		expect(bin).toBe("/usr/local/bin/lilypond");
	});

	it("reads the .cropped.svg file when crop is true", async () => {
		mockReadFile.mockResolvedValueOnce(Buffer.from("<svg>cropped</svg>"));

		const result = await render("\\score { }", { crop: true });
		expect(result.toString()).toBe("<svg>cropped</svg>");
		const [path] = mockReadFile.mock.calls[0];
		expect(String(path)).toMatch(/\.cropped\.svg$/);
	});

	it("falls back to uncropped file if cropped file is missing", async () => {
		mockReadFile
			.mockRejectedValueOnce(new Error("ENOENT"))
			.mockResolvedValueOnce(Buffer.from("<svg>uncropped</svg>"));

		const result = await render("\\score { }", { crop: true });
		expect(result.toString()).toBe("<svg>uncropped</svg>");
	});

	it("falls back to numbered output file when crop is off and direct read fails", async () => {
		mockReadFile
			.mockRejectedValueOnce(new Error("ENOENT"))
			.mockResolvedValueOnce(Buffer.from("<svg>page1</svg>"));

		const result = await render("\\score { }", { crop: false });
		expect(result.toString()).toBe("<svg>page1</svg>");
		expect(mockReadFile).toHaveBeenCalledTimes(2);
	});
});
