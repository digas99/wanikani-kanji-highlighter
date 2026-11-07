/**
 * cjk-highlighter: highlighting Japanese and Chinese on web pages, for any extension.
 *
 * The extension brings what to highlight (a Matcher) and how it looks (its highlight names and
 * styles, or spans); this does the page: which text to read, words over furigana, painting
 * without touching the page, following the page as it changes, and telling Japanese from
 * Chinese by paragraph (so two extensions can share a page).
 *
 * Plain DOM and TypeScript: no extension APIs, no framework.
 */

export type { Match, Matcher, Renderer } from './types';
export {
	PageHighlighter,
	SpanRenderer,
	clearSpans,
	BLOCK_SELECTOR,
	UNWANTED_TAGS,
	type PageHighlighterOptions,
} from './pageHighlighter';
export { RangeHighlights, supportsRangeHighlights, type RangeHit } from './rangeHighlights';
export { HighlightSession, type HighlightSessionOptions } from './session';
export {
	LanguageGate,
	activePageLanguage,
	classifyText,
	countSignals,
	languageOfAttribute,
	languageOfSignals,
	onPageLanguageChange,
	paragraphOf,
	sentenceKept,
	sentenceRanges,
	textByLanguage,
	type LanguageChoice,
	type LanguageGateOptions,
	type LanguageRules,
	type LanguageSignals,
	type LanguageSummary,
	type TextLanguage,
} from './textLanguage';
export { mountLanguageDebug, unmountLanguageDebug } from './languageDebug';
