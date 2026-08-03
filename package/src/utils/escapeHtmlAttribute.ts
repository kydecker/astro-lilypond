/**
 * Escape a string for safe interpolation inside a double-quoted
 * HTML attribute value.
 */
export function escapeHtmlAttribute(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;");
}
