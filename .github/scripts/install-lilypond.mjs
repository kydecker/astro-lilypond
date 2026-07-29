// Downloads LilyPond via astro-lilypond's own auto-install support (the
// same code path `astro build` uses) and appends its `bin/` dir to
// $GITHUB_PATH. Requires `pnpm --filter astro-lilypond build` to have run
// first, so `package/dist/binary/downloadLilypond.js` exists.
//
// Used by CI's `test:integration` job, which — unlike a real Astro build —
// calls `render()` directly against `lilypond` on PATH, bypassing the
// integration (and its auto-install) entirely. Everything else in CI goes
// through the integration and downloads LilyPond on its own.
import { appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import { downloadLilypond } from "../../package/dist/binary/downloadLilypond.js";

const version = process.env.LILYPOND_VERSION ?? "2.26.0";

const binaryPath = await downloadLilypond({ version, log: console.log });
if (!binaryPath) {
	console.error(
		`No prebuilt LilyPond ${version} is available for ${process.platform}/${process.arch}.`,
	);
	process.exit(1);
}

await appendFile(process.env.GITHUB_PATH, `${dirname(binaryPath)}\n`);
