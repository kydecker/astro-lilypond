import { beforeEach, describe, expect, it, vi } from "vitest";

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
	resolution: 144,
	crop: true,
	includePaths: [] as string[],
	timeout: 60_000,
	inputPath: "/tmp/dir/input.ly",
	outputBase: "/tmp/dir/output",
};

beforeEach(() => {
	vi.clearAllMocks();
	mockExecFileResult((cb) => cb(null, { stdout: "", stderr: "" }));
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
		await execLilyPond({ ...baseOptions, resolution: 300 });
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--define-default=resolution=300");
	});

	it("passes crop=#t when crop is true", async () => {
		await execLilyPond({ ...baseOptions, crop: true });
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--define-default=crop=#t");
	});

	it("passes crop=#f when crop is false", async () => {
		await execLilyPond({ ...baseOptions, crop: false });
		const [, args] = mockExecFile.mock.calls[0] as unknown as [
			string,
			string[],
		];
		expect(args).toContain("--define-default=crop=#f");
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
		const writeSpy = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		mockExecFileResult((cb) =>
			cb(null, {
				stdout: "",
				stderr: "Success: compilation successfully completed",
			}),
		);
		await execLilyPond(baseOptions);
		expect(writeSpy).toHaveBeenCalledWith(
			"Success: compilation successfully completed",
		);
		writeSpy.mockRestore();
	});

	it("does not write to process.stderr when there is no stderr output", async () => {
		const writeSpy = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		await execLilyPond(baseOptions);
		expect(writeSpy).not.toHaveBeenCalled();
		writeSpy.mockRestore();
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
