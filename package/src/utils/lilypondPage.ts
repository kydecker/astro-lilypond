/**
 * A single rendered page: its public URL, and its pixel/CSS-unit dimensions
 * if they could be determined from the rendered bytes.
 */
export interface LilypondPage {
	src: string;
	width?: number;
	height?: number;
}
