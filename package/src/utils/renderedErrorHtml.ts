import { escapeHtml } from "./escapeHtml.js";

const ERROR_STYLE =
	"all: initial; display: block; margin: 1em 0; padding: 1em; " +
	"color-scheme: light dark; " +
	"border: 2px solid light-dark(#dc2626, #f87171); border-radius: 6px; " +
	"background: light-dark(#fef2f2, #450a0a); " +
	"color: light-dark(#7f1d1d, #fca5a5); " +
	"font-family: ui-monospace, monospace; " +
	"font-size: 0.875rem; line-height: 1.5; white-space: pre-wrap; " +
	"overflow-wrap: break-word; text-align: left;";

function messageFor(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function renderedErrorHtml(error: unknown, title: string): string {
	const heading = `LilyPond failed to render "${escapeHtml(title)}"`;
	return `<pre style="${ERROR_STYLE}">${heading}\n\n${escapeHtml(messageFor(error))}</pre>`;
}
