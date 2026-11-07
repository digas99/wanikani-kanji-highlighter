/**
 * Settings → Highlight: what's done with Chinese text, and with text that could be Japanese or
 * Chinese (only kanji both use, on a page that doesn't tell). See highlight/textLanguage.ts.
 */

/** The sites where text that could be either goes the other way from the setting. */
export const UNCLEAR_TEXT_SITES_KEY = 'local:unclearTextSites';

export const CHINESE_TEXT_OPTIONS = [
	{ value: 'highlight', label: 'Highlight its kanji' },
	{ value: 'skip', label: "Don't highlight" },
];

export const UNCLEAR_TEXT_OPTIONS = [
	{ value: 'highlight', label: 'Highlight' },
	{ value: 'skip', label: "Don't highlight" },
];
