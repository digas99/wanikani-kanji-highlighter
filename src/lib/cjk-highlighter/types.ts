/**
 * What an extension plugs into the highlighter: a Matcher finds what to highlight in a text,
 * a Renderer shows it. The page side (walking the page, following its changes, Japanese or
 * Chinese) is the same for every extension.
 */

/**
 * Something to highlight, by position in a text node's text (or a run of them: furigana).
 * `value`: what it is (a conjugated word's dictionary form: 話して → 話す); the text highlighted
 * is the page's own.
 */
export type Match<T = unknown> = {
	start: number;
	end: number;
	value: string;
	/** the extension's kind of item ('kanji', 'vocabulary', 'hanzi', …) */
	type: string;
	/** the painted highlight it goes in (::highlight(name)): namespaced by the extension */
	name: string;
	/** the extension's own (its colors, its stage…) */
	data: T;
};

/** Finds what to highlight in text: an extension's kanji / words / hanzi. */
export interface Matcher<T = unknown> {
	/** anything to highlight at all */
	isActive(): boolean;
	/** a quick check: is this text worth looking at */
	hasMatch(text: string): boolean;
	findMatches(text: string): Match<T>[];
	/** matches can span text nodes (words over furigana / pinyin): runs are matched as one text */
	readonly matchesRuns: boolean;
}

/** Shows a text node's matches (painted, or in spans). */
export interface Renderer<T = unknown> {
	/** even without matches: the text may have changed, and its old highlights must go */
	render(node: Text, matches: Match<T>[]): void;
	/** text split over several nodes (furigana), by position in their joined text */
	renderRun?(nodes: Text[], matches: Match<T>[]): void;
	/** an element the renderer made (a highlight span): its text isn't the page's to look at */
	owns?(element: Element): boolean;
}
