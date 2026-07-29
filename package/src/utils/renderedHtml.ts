import { escapeHtmlAttribute } from "./escapeHtmlAttribute.js";
import type { LilypondPage } from "./lilypondPage.js";

function imgTag(page: LilypondPage, escapedAlt: string): string {
	const size =
		page.width !== undefined && page.height !== undefined
			? ` width="${page.width}" height="${page.height}"`
			: "";
	return `<img data-lilypond-image src="${page.src}"${size} alt="${escapedAlt}">`;
}

export function renderedHtml(pages: LilypondPage[], alt: string): string {
	const escapedAlt = escapeHtmlAttribute(alt);

	if (pages.length === 1) {
		return imgTag(pages[0], escapedAlt);
	}

	return `<ol data-lilypond-group>${pages
		.map((page) => `<li>${imgTag(page, escapedAlt)}</li>`)
		.join("")}</ol>`;
}
