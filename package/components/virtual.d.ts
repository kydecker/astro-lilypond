declare module "*.ly" {
	const exports: { cropped: string; uncropped: string };
	export default exports;
}

declare module "*.lilypond" {
	const exports: { cropped: string; uncropped: string };
	export default exports;
}
