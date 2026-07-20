import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ExecFileCb = (
	err: unknown,
	res?: { stdout: string; stderr: string },
) => void;

vi.mock("child_process", () => ({
	execFile: vi.fn(
		(_bin: string, _args: string[], _options: unknown, cb: ExecFileCb) => {
			cb(null, { stdout: "", stderr: "" });
		},
	),
}));

import { execFile } from "node:child_process";
import { execLilyPond } from "./execLilyPond.js";

const mockExecFile = vi.mocked(execFile);

function mockExecFileResult(handler: (cb: ExecFileCb) => void) {
	mockExecFile.mockImplementation(((
		_bin: string,
		_args: string[],
		_options: unknown,
		cb: ExecFileCb,
	) => {
		handler(cb);
	}) as typeof execFile);
}

const baseOptions = {
	binaryPath: "lilypond",
	format: "svg" as const,
	defaults: {
		resolution: 144,
		crop: true,
		staffSize: 20,
		paperSize: "a4",
	},
	includePaths: [] as string[],
	timeout: 60_000,
	inputPath: "/tmp/dir/input.ly",
	outputBase: "/tmp/dir/output",
};

// lilypond writes its progress log (and any warnings/errors) to stderr even
// on success, and execLilyPond.ts deliberately mirrors that to
// process.stderr for build visibility. Silence it here so
// intentionally-simulated errors/warnings in the tests below don't pollute
// CI output — tests that specifically assert on what gets written use this
// same spy.
let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	vi.clearAllMocks();
	mockExecFileResult((cb) => cb(null, { stdout: "", stderr: "" }));
	stderrWriteSpy = vi
		.spyOn(process.stderr, "write")
		.mockImplementation(() => true);
});

afterEach(() => {
	stderrWriteSpy.mockRestore();
});

describe("execLilyPond", () => {
	it("invokes the given binaryPath", async () => {
		await execLilyPond({
			...baseOptions,
			binaryPath: "/usr/local/bin/lilypond",
		});
		const [bin] = mockExecFile.mock.calls[0] as unknown as [string];
		expect(bin).toBe("/usr/local/bin/lilypond");
	});

	it("passes --format=<format>", async () => {
		await execLilyPond({ ...baseOptions, format: "png" });
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--format=png");
	});

	it("always passes no-point-and-click and the cairo backend", async () => {
		await execLilyPond(baseOptions);
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--define-default=no-point-and-click");
		expect(args).toContain("--define-default=backend=cairo");
	});

	it("passes the resolution as a DPI define", async () => {
		await execLilyPond({
			...baseOptions,
			defaults: { ...baseOptions.defaults, resolution: 300 },
		});
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--define-default=resolution=300");
	});

	it("passes crop=#t when crop is true", async () => {
		await execLilyPond({
			...baseOptions,
			defaults: { ...baseOptions.defaults, crop: true },
		});
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--define-default=crop=#t");
	});

	it("passes crop=#f when crop is false", async () => {
		await execLilyPond({
			...baseOptions,
			defaults: { ...baseOptions.defaults, crop: false },
		});
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--define-default=crop=#f");
	});

	it("passes the staff size define", async () => {
		await execLilyPond({
			...baseOptions,
			defaults: { ...baseOptions.defaults, staffSize: 16 },
		});
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--define-default=staff-size=16");
	});

	it("passes the paper size define", async () => {
		await execLilyPond({
			...baseOptions,
			defaults: { ...baseOptions.defaults, paperSize: "letter" },
		});
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--define-default=paper-size=letter");
	});

	it("passes --include for each includePaths entry", async () => {
		await execLilyPond({
			...baseOptions,
			includePaths: ["/docs/src/examples", "/other/dir"],
		});
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--include=/docs/src/examples");
		expect(args).toContain("--include=/other/dir");
	});

	it("passes --output <outputBase> <inputPath> as the final arguments", async () => {
		await execLilyPond(baseOptions);
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args.slice(-3)).toEqual([
			"--output",
			baseOptions.outputBase,
			baseOptions.inputPath,
		]);
	});

	it("passes an AbortSignal and a generous maxBuffer", async () => {
		await execLilyPond(baseOptions);
		const [, , options] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
			{ signal: AbortSignal; maxBuffer: number },
		];
		expect(options.signal).toBeInstanceOf(AbortSignal);
		expect(options.maxBuffer).toBeGreaterThan(1024 * 1024);
	});

	it("resolves without throwing when lilypond exits zero", async () => {
		await expect(execLilyPond(baseOptions)).resolves.toBeUndefined();
	});

	it("writes stderr to process.stderr for visibility even on success", async () => {
		mockExecFileResult((cb) =>
			cb(null, {
				stdout: "",
				stderr: "Success: compilation successfully completed",
			}),
		);
		await execLilyPond(baseOptions);
		expect(stderrWriteSpy).toHaveBeenCalledWith(
			"Success: compilation successfully completed",
		);
	});

	it("does not write to process.stderr when there is no stderr output", async () => {
		await execLilyPond(baseOptions);
		expect(stderrWriteSpy).not.toHaveBeenCalled();
	});

	it("throws using the child's stderr when lilypond exits with a non-zero status", async () => {
		mockExecFileResult((cb) =>
			cb(
				Object.assign(new Error("Command failed"), {
					stderr: "fatal error: bad input",
				}),
			),
		);
		await expect(execLilyPond(baseOptions)).rejects.toThrow(
			"fatal error: bad input",
		);
	});

	it("throws the error message when the failure has no stderr", async () => {
		mockExecFileResult((cb) => cb(new Error("spawn ENOENT")));
		await expect(execLilyPond(baseOptions)).rejects.toThrow("spawn ENOENT");
	});

	it("throws a clear timeout message when the invocation is aborted", async () => {
		mockExecFileResult((cb) =>
			cb(
				Object.assign(new Error("The operation was aborted"), {
					name: "AbortError",
				}),
			),
		);
		await expect(
			execLilyPond({ ...baseOptions, timeout: 5000 }),
		).rejects.toThrow("lilypond timed out after 5000ms");
	});
});
