import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// execFile supports both `(file, args, callback)` and
// `(file, args, options, callback)` — render.ts now always passes options
// (for `signal`/`maxBuffer`), so the mock must accept either arity.
function normalizeExecFileCb<T>(
	maybeOptions: T | ((...args: never[]) => void),
	maybeCb?: (...args: never[]) => void,
) {
	return typeof maybeOptions === "function" ? maybeOptions : maybeCb;
}

vi.mock("child_process", () => ({
	execFile: vi.fn(
		(
			_bin: string,
			_args: string[],
			optionsOrCb: unknown,
			cb?: (err: null, result: { stdout: string; stderr: string }) => void,
		) => {
			const callback = normalizeExecFileCb(
				optionsOrCb as never,
				cb as never,
			) as (err: null, result: { stdout: string; stderr: string }) => void;
			callback(null, { stdout: "", stderr: "" });
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

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { defaultOptions, render } from "./render.js";

const mockExecFile = vi.mocked(execFile);
const mockReadFile = vi.mocked(readFile);

type ExecFileCb = (
	err: unknown,
	res?: { stdout: string; stderr: string },
) => void;

// Sets up execFile's mocked implementation to call `handler` with the
// normalized callback, regardless of whether render.ts called it with or
// without an options argument.
function mockExecFileResult(handler: (cb: ExecFileCb) => void) {
	mockExecFile.mockImplementation(((
		_bin: string,
		_args: string[],
		optionsOrCb: unknown,
		cb?: ExecFileCb,
	) => {
		const callback = normalizeExecFileCb(
			optionsOrCb as never,
			cb as never,
		) as ExecFileCb;
		handler(callback);
	}) as typeof execFile);
}

// lilypond writes its progress log (and any warnings/errors) to stderr even
// on success, and render.ts deliberately mirrors that to process.stderr for
// build visibility. Silence it here so intentionally-simulated
// errors/warnings in the tests below don't pollute CI output — tests that
// specifically assert on what gets written use this same spy.
let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	vi.clearAllMocks();
	mockExecFileResult((cb) => cb(null, { stdout: "", stderr: "" }));
	mockReadFile.mockResolvedValue(Buffer.from("<svg>fake</svg>"));
	stderrWriteSpy = vi
		.spyOn(process.stderr, "write")
		.mockImplementation(() => true);
});

afterEach(() => {
	stderrWriteSpy.mockRestore();
});

describe("render", () => {
	it("resolves to a Buffer", async () => {
		const result = await render("\\score { }");
		expect(Buffer.isBuffer(result)).toBe(true);
	});

	it("passes --format=svg flag for svg format", async () => {
		await render("\\score { }", { format: "svg" });
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--format=svg");
	});

	it("passes the cairo backend", async () => {
		await render("\\score { }");
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--define-default=backend=cairo");
	});

	it("passes --define-default=crop=#t when crop is true", async () => {
		await render("\\score { }", { defaults: { crop: true } });
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--define-default=crop=#t");
	});

	it("passes --define-default=crop=#f when crop is false", async () => {
		await render("\\score { }", { defaults: { crop: false } });
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--define-default=crop=#f");
	});

	it("crop is true by default", () => {
		expect(defaultOptions.defaults.crop).toBe(true);
	});

	it("has no default version, so blocks must declare \\version themselves unless configured", () => {
		expect(defaultOptions.defaults.version).toBeUndefined();
	});

	it("throws when format is unsupported", async () => {
		await expect(
			// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
			render("\\score { }", { format: "docx" as any }),
		).rejects.toThrow("docx is not a supported format");
	});

	it("throws when lilypond exits with a non-zero status", async () => {
		mockExecFileResult((cb) =>
			cb(
				Object.assign(new Error("Command failed"), {
					stderr: "fatal error: bad input",
				}),
			),
		);
		await expect(render("bad")).rejects.toThrow("fatal error: bad input");
	});

	it("does not throw when lilypond writes warnings to stderr but exits zero", async () => {
		mockExecFileResult((cb) =>
			cb(null, {
				stdout: "",
				stderr: "warning: some other unexpected warning",
			}),
		);
		await expect(render("\\score { }")).resolves.toBeInstanceOf(Buffer);
	});

	it("writes stderr to process.stderr for visibility even on success", async () => {
		mockExecFileResult((cb) =>
			cb(null, {
				stdout: "",
				stderr:
					"Processing `input.ly'\nSuccess: compilation successfully completed",
			}),
		);
		await render("\\score { }");
		expect(stderrWriteSpy).toHaveBeenCalledWith(
			"Processing `input.ly'\nSuccess: compilation successfully completed",
		);
	});

	it("passes signal and maxBuffer options to execFile", async () => {
		await render("\\score { }");
		const [, , options] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
			{ signal: AbortSignal; maxBuffer: number },
		];
		expect(options.signal).toBeInstanceOf(AbortSignal);
		expect(options.maxBuffer).toBeGreaterThan(1024 * 1024);
	});

	it("throws a clear message when lilypond times out", async () => {
		mockExecFile.mockImplementation(((
			_bin: string,
			_args: string[],
			_options: unknown,
			cb: ExecFileCb,
		) => {
			cb(
				Object.assign(new Error("The operation was aborted"), {
					name: "AbortError",
				}),
			);
		}) as typeof execFile);
		await expect(render("\\score { }", { timeout: 5000 })).rejects.toThrow(
			"lilypond timed out after 5000ms",
		);
	});

	it("passes --include for each includePaths entry so \\include can find sibling files", async () => {
		await render("\\score { }", {
			includePaths: ["/docs/src/examples", "/other/dir"],
		});
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--include=/docs/src/examples");
		expect(args).toContain("--include=/other/dir");
	});

	it("uses a custom binaryPath when provided", async () => {
		await render("\\score { }", { binaryPath: "/usr/local/bin/lilypond" });
		const [bin] = mockExecFile.mock.calls[0] as unknown as [string, string[]];
		expect(bin).toBe("/usr/local/bin/lilypond");
	});

	it("reads the .cropped.svg file when crop is true", async () => {
		mockReadFile.mockResolvedValueOnce(Buffer.from("<svg>cropped</svg>"));

		const result = await render("\\score { }", { defaults: { crop: true } });
		expect(result.toString()).toBe("<svg>cropped</svg>");
		const [path] = mockReadFile.mock.calls[0];
		expect(String(path)).toMatch(/\.cropped\.svg$/);
	});

	it("throws if the cropped file is missing when crop is true", async () => {
		mockReadFile.mockRejectedValueOnce(new Error("ENOENT"));

		await expect(
			render("\\score { }", { defaults: { crop: true } }),
		).rejects.toThrow("expected cropped output");
	});

	it("falls back to numbered output file when crop is off and direct read fails", async () => {
		mockReadFile
			.mockRejectedValueOnce(new Error("ENOENT"))
			.mockResolvedValueOnce(Buffer.from("<svg>page1</svg>"));

		const result = await render("\\score { }", { defaults: { crop: false } });
		expect(result.toString()).toBe("<svg>page1</svg>");
		expect(mockReadFile).toHaveBeenCalledTimes(2);
	});

	it("falls back to <base>-page1.<format> for multi-page PNG output, which lilypond names differently than svg/pdf", async () => {
		mockReadFile
			.mockRejectedValueOnce(new Error("ENOENT")) // output.png
			.mockRejectedValueOnce(new Error("ENOENT")) // output-1.png
			.mockResolvedValueOnce(Buffer.from("fake-png-page1"));

		const result = await render("\\score { }", {
			format: "png",
			defaults: { crop: false },
		});
		expect(result.toString()).toBe("fake-png-page1");
		expect(mockReadFile).toHaveBeenCalledTimes(3);
		const [path] = mockReadFile.mock.calls[2] as unknown as [string];
		expect(String(path)).toMatch(/-page1\.png$/);
	});
});
