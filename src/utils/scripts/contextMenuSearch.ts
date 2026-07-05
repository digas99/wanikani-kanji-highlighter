export const CONTEXT_MENU_ID = 'wkhighlighterSearchKanji';
export const CONTEXT_MENU_DEFAULT_TITLE = 'Search With WKHighlighter';
export const CONTEXT_MENU_SEARCH_STORAGE_KEY = 'local:contextMenuSelectedText';

export function formatContextMenuTitle(selectedText: string): string {
	const trimmed = selectedText.trim();
	if (!trimmed) return CONTEXT_MENU_DEFAULT_TITLE;

	const preview = trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
	return `Search WaniKani for "${preview}"`;
}
