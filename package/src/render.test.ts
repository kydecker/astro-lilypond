import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type MockedFunction,
	vi,
} from "vitest";

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
		readdir: vi.fn(async () => ["output.svg"]),
		readFile: vi.fn(async () => Buffer.from("<svg>fake</svg>")),
		rm: vi.fn(async () => {}),
	};
});

import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { defaultOptions, render } from "./render.js";

const mockExecFile = vi.mocked(execFile);
const mockReaddir = vi.mocked(readdir) as unknown as MockedFunction<
	(dir: string) => Promise<string[]>
>;
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
	mockReaddir.mockResolvedValue(["output.svg"]);
	mockReadFile.mockResolvedValue(Buffer.from("<svg>fake</svg>"));
	stderrWriteSpy = vi
		.spyOn(process.stderr, "write")
		.mockImplementation(() => true);
});

afterEach(() => {
	stderrWriteSpy.mockRestore();
});

describe("render", () => {
	it("resolves to an array of Buffers", async () => {
		const result = await render("\\score { }");
		expect(Array.isArray(result)).toBe(true);
		expect(result.every((buf) => Buffer.isBuffer(buf))).toBe(true);
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
		await render("\\score { }", { crop: true });
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--define-default=crop=#t");
	});

	it("passes --define-default=crop=#f when crop is false", async () => {
		await render("\\score { }", { crop: false });
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--define-default=crop=#f");
	});

	it("crop is true by default", () => {
		expect(defaultOptions.crop).toBe(true);
	});

	it("version defaults to 2.26.0", () => {
		expect(defaultOptions.defaults.version).toBe("2.26.0");
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
		const result = await render("\\score { }");
		expect(result[0]).toBeInstanceOf(Buffer);
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

		const result = await render("\\score { }", { crop: true });
		expect(result).toHaveLength(1);
		expect(result[0].toString()).toBe("<svg>cropped</svg>");
		const [path] = mockReadFile.mock.calls[0];
		expect(String(path)).toMatch(/\.cropped\.svg$/);
	});

	it("throws if the cropped file is missing when crop is true", async () => {
		mockReadFile.mockRejectedValueOnce(new Error("ENOENT"));

		await expect(render("\\score { }", { crop: true })).rejects.toThrow(
			"expected cropped output",
		);
	});

	it("reads every numbered page when crop is off and the output spans multiple pages", async () => {
		mockReaddir.mockResolvedValue(["output-1.svg", "output-2.svg"]);
		mockReadFile.mockImplementation(async (path) =>
			Buffer.from(`content:${String(path)}`),
		);

		const result = await render("\\score { }", { crop: false });
		expect(result.map((buf) => buf.toString())).toEqual([
			"content:/tmp/astro-lilypond-test/output-1.svg",
			"content:/tmp/astro-lilypond-test/output-2.svg",
		]);
	});

	it("reads <base>-pageN.<format> pages for multi-page PNG output, which lilypond names differently than svg/pdf", async () => {
		mockReaddir.mockResolvedValue(["output-page1.png"]);
		mockReadFile.mockResolvedValueOnce(Buffer.from("fake-png-page1"));

		const result = await render("\\score { }", {
			format: "png",
			crop: false,
		});
		expect(result).toHaveLength(1);
		expect(result[0].toString()).toBe("fake-png-page1");
		const [path] = mockReadFile.mock.calls[0] as unknown as [string];
		expect(String(path)).toMatch(/-page1\.png$/);
	});
});
