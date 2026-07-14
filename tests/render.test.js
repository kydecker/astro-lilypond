import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the child_process and fs modules so tests don't invoke the real binary
vi.mock("child_process", () => ({
	execFile: vi.fn((bin, args, cb) => cb(null, { stdout: "", stderr: "" })),
}));

vi.mock("fs/promises", async (importOriginal) => {
	const actual = await importOriginal();
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

beforeEach(() => {
	vi.clearAllMocks();
	execFile.mockImplementation((_bin, _args, cb) =>
		cb(null, { stdout: "", stderr: "" }),
	);
	readFile.mockResolvedValue(Buffer.from("<svg>fake</svg>"));
});

describe("render", () => {
	it("resolves to a Buffer", async () => {
		const result = await render("\\score { }");
		expect(Buffer.isBuffer(result)).toBe(true);
	});

	it("passes --svg flag for svg format", async () => {
		await render("\\score { }", { format: "svg" });
		const [, args] = execFile.mock.calls[0];
		expect(args).toContain("--svg");
	});

	it("passes --define-default crop when crop is true", async () => {
		await render("\\score { }", { crop: true });
		const [, args] = execFile.mock.calls[0];
		const cropIdx = args.indexOf("crop");
		expect(cropIdx).toBeGreaterThan(-1);
		expect(args[cropIdx - 1]).toBe("--define-default");
	});

	it("omits crop args when crop is false", async () => {
		await render("\\score { }", { crop: false });
		const [, args] = execFile.mock.calls[0];
		expect(args).not.toContain("crop");
	});

	it("crop is true by default", () => {
		expect(defaultOptions.crop).toBe(true);
	});

	it("throws when format is unsupported", async () => {
		await expect(render("\\score { }", { format: "docx" })).rejects.toThrow(
			"docx is not a supported format",
		);
	});

	it("throws when lilypond reports an error on stderr", async () => {
		execFile.mockImplementation((_bin, _args, cb) =>
			cb(null, { stdout: "", stderr: "fatal error: bad input" }),
		);
		await expect(render("bad")).rejects.toThrow("fatal error: bad input");
	});

	it("uses a custom binaryPath when provided", async () => {
		await render("\\score { }", { binaryPath: "/usr/local/bin/lilypond" });
		const [bin] = execFile.mock.calls[0];
		expect(bin).toBe("/usr/local/bin/lilypond");
	});

	it("reads the .cropped.svg file when crop is true", async () => {
		readFile.mockResolvedValueOnce(Buffer.from("<svg>cropped</svg>"));

		const result = await render("\\score { }", { crop: true });
		expect(result.toString()).toBe("<svg>cropped</svg>");
		const path = readFile.mock.calls[0][0];
		expect(path).toMatch(/\.cropped\.svg$/);
	});

	it("falls back to uncropped file if cropped file is missing", async () => {
		readFile
			.mockRejectedValueOnce(new Error("ENOENT")) // .cropped.svg missing
			.mockResolvedValueOnce(Buffer.from("<svg>uncropped</svg>"));

		const result = await render("\\score { }", { crop: true });
		expect(result.toString()).toBe("<svg>uncropped</svg>");
	});

	it("falls back to numbered output file when crop is off and direct read fails", async () => {
		readFile
			.mockRejectedValueOnce(new Error("ENOENT"))
			.mockResolvedValueOnce(Buffer.from("<svg>page1</svg>"));

		const result = await render("\\score { }", { crop: false });
		expect(result.toString()).toBe("<svg>page1</svg>");
		expect(readFile).toHaveBeenCalledTimes(2);
	});
});
