/**
 * Applies WaniKani kanji/vocab highlighting inside a SubjectDisplay panel.
 * Skips the main character block (.sd-focusPopup_kanji).
 */

import { storage } from '#imports';
import { KanjiHighlighter, clearHighlights, HIGHLIGHT_MARK_CLASS } from './highlighter';
import { buildHighlightConfig } from './highlightConfig';

export const HIGHLIGHT_HOVERABLE_CLASS = 'wkhighlighter_hoverable';

let cachedConfigKey = '';
let cachedHighlighter: KanjiHighlighter | null = null;

async function getSubjectHighlighter(): Promise<KanjiHighlighter | null> {
	const [settings, data] = await Promise.all([
		storage.getItem<any>('local:settings'),
		storage.getItem<any>('local:highlightData'),
	]);
	const key = `${data?.updatedAt ?? 0}:${settings?.highlighter?.target}:${settings?.highlighter?.color_by}:${settings?.highlight_style?.learned}`;
	if (key !== cachedConfigKey) {
		cachedConfigKey = key;
		const config = buildHighlightConfig(settings, data);
		cachedHighlighter = config ? new KanjiHighlighter(config) : null;
	}
	if (!cachedHighlighter?.isActive()) return null;
	return cachedHighlighter;
}

/** Remove highlight spans under a subject-details root. */
export function clearSubjectDetailsHighlights(root: ParentNode): void {
	clearHighlights(root);
}

/** Highlight mnemonic / sentence text inside a subject-details panel. */
export async function applySubjectDetailsHighlights(
	root: ParentNode,
	options: { markHoverable?: boolean } = {},
): Promise<void> {
	const highlighter = await getSubjectHighlighter();
	clearSubjectDetailsHighlights(root);
	if (!highlighter) return;

	const detailRoot = root instanceof HTMLElement && root.matches('.sd-detailsPopup')
		? root
		: root.querySelector('.sd-detailsPopup');
	if (!detailRoot) return;

	highlighter.highlightRoot(detailRoot);

	if (options.markHoverable) {
		detailRoot.querySelectorAll(`span.${HIGHLIGHT_MARK_CLASS}`).forEach(span => {
			if (!span.closest('.sd-focusPopup_kanji, .sd-compactPopup_body')) {
				span.classList.add(HIGHLIGHT_HOVERABLE_CLASS);
			}
		});
	}
}

export function invalidateSubjectHighlightCache(): void {
	cachedConfigKey = '';
	cachedHighlighter = null;
}
