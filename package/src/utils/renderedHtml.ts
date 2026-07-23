import { escapeHtmlAttribute } from "./escapeHtmlAttribute.js";

export interface RenderedPage {
	url: string;
	width?: number;
	height?: number;
}

function imgTag(page: RenderedPage, escapedAlt: string): string {
	const size =
		page.width !== undefined && page.height !== undefined
			? ` width="${page.width}" height="${page.height}"`
			: "";
	return `<img data-lilypond-image src="${page.url}"${size} alt="${escapedAlt}">`;
}

export function renderedHtml(pages: RenderedPage[], alt: string): string {
	const escapedAlt = escapeHtmlAttribute(alt);

	if (pages.length === 1) {
		return imgTag(pages[0], escapedAlt);
	}

	return `<ol data-lilypond-group>${pages
		.map((page) => `<li>${imgTag(page, escapedAlt)}</li>`)
		.join("")}</ol>`;
}
