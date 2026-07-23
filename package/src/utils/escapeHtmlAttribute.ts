/**
 * Escapes a string for safe interpolation inside a double-quoted HTML
 * attribute value. Used for alt text, which — unlike the srcs this
 * integration already emits — is arbitrary user/header-derived content that
 * can contain `"`, `&`, `<`.
 */
export function escapeHtmlAttribute(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;");
}
