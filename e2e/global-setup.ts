import { execSync } from "node:child_process";

// All three apps import `astro-lilypond` from the workspace; build it once.
export default function globalSetup(): void {
	execSync("pnpm --filter astro-lilypond build", { stdio: "inherit" });
}
