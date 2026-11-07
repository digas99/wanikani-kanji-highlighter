/**
 * Highlighter for WaniKani kanji and vocabulary.
 *
 * Two targets are supported:
 *   - "kanji":      individual learned / not-learned kanji characters.
 *   - "vocabulary": tokenizes Japanese text with TinySegmenter and matches runs of
 *                   tokens that are a known WaniKani vocabulary word
 *                   (greedy longest match).
 *
 * Coloring modes:
 *   - "learned":    learned vs not-yet-learned (two colors / styles)
 *   - "srs_stage":  one color per SRS stage (Initiate through Burned, plus Locked)
 *
 * What's highlighted is found per text node (findMatches); how it's shown depends on
 * the renderer: by default each match is wrapped in a span, while web pages use a
 * renderer that paints the matches without touching the page (see rangeHighlights.ts).
 *
 * Works on any subtree, so it can be driven as a full-page pass or incrementally
 * (per element entering the viewport).
 */

import TinySegmenter from 'tiny-segmenter';
import {
	createEmptyKanjiByStage,
	createEmptyVocabByStage,
	type SrsStageKey,
} from './srsStageHighlight';
import type { JlptGradeKey, JoyoGradeKey, SchoolGradeKey } from './schoolGradeHighlight';
import { ConjugationMatcher } from './deinflect';
import { scanWords } from './wordScan';
import type { LanguageGate } from './textLanguage';

export type HighlightTarget = 'kanji' | 'vocabulary' | 'mixed';
export type HighlightColorBy = 'learned' | 'srs_stage' | 'jlpt' | 'joyo';

export type HighlightedItem = {
	value: string;
	type: 'kanji' | 'vocabulary';
	learned?: boolean;
	srsStage?: number | null;
	schoolGrade?: SchoolGradeKey;
};

export type HighlightConfig = {
	target: HighlightTarget;
	colorBy: HighlightColorBy;
	learnedChars: string;
	notLearnedChars: string;
	learnedWords: string[];
	notLearnedWords: string[];
	/** word → how it conjugates (deinflect.ts): conjugated forms on pages find their word */
	wordInflections?: Record<string, number>;
	kanjiByStage: Record<SrsStageKey, string>;
	vocabByStage: Record<SrsStageKey, string[]>;
	kanjiByJlpt: Record<JlptGradeKey, string>;
	kanjiByJoyo: Record<JoyoGradeKey, string>;
	vocabByJlpt?: Record<JlptGradeKey, string[]>;
	vocabByJoyo?: Record<JoyoGradeKey, string[]>;
	stageColors: Record<SrsStageKey, string>;
	gradeColors: Record<SchoolGradeKey, string>;
	learnedClass: string;
	notLearnedClass: string;
	srsStyleClass: string;
	highlightLearned: boolean;
	highlightNotLearned: boolean;
};

export type MatchMeta =
	| { mode: 'learned'; learned: boolean }
	| { mode: 'srs_stage'; stageKey: SrsStageKey }
	| { mode: 'jlpt'; gradeKey: JlptGradeKey }
	| { mode: 'joyo'; gradeKey: JoyoGradeKey };

/**
 * A kanji / word to highlight, by position in a text node's text. `value`: the WaniKani word (a
 * conjugated one's dictionary form: 話して → 話す); the text highlighted is the text's own.
 */
export type HighlightMatch = {
	start: number;
	end: number;
	value: string;
	type: 'kanji' | 'vocabulary';
	meta: MatchMeta;
};

/** On a highlight span whose text is a conjugated form: the word it is (話して → 話す). */
export const HIGHLIGHT_VALUE_ATTRIBUTE = 'data-wkh-value';

/** The WaniKani word a highlight span is (its text, or the word its conjugated text is). */
export function highlightValueOf(span: Element): string {
	return (span.getAttribute(HIGHLIGHT_VALUE_ATTRIBUTE) ?? span.textContent ?? '').trim();
}

/** how much longer than its word a conjugated form may be (話していませんでした) */
const MAX_CONJUGATION = 10;

/** Shows the matches of a text node some other way than wrapping them in spans. */
export interface HighlightRenderer {
	render(node: Text, matches: HighlightMatch[]): void;
	/**
	 * Text split over several nodes (a word with furigana: <ruby>話<rt>はな</rt></ruby>していました):
	 * the matches by position in the nodes' joined text, some spanning nodes.
	 */
	renderRun?(nodes: Text[], matches: HighlightMatch[]): void;
}

/** Which painted highlight (CSS ::highlight name) a match belongs to. */
export function highlightNameFor(meta: MatchMeta): string {
	if (meta.mode === 'srs_stage') return `wkh-srs-${meta.stageKey}`;
	if (meta.mode === 'jlpt' || meta.mode === 'joyo') return `wkh-${meta.mode}-${meta.gradeKey}`;
	return meta.learned ? 'wkh-learned' : 'wkh-not-learned';
}

/** Marker class shared by every highlighted span (used for cleanup + skip). */
export const HIGHLIGHT_MARK_CLASS = 'wkhighlighter_clickable';

/** Tags whose text content must never be touched. */
const UNWANTED_TAGS = new Set([
	'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION',
	'CODE', 'PRE', 'KBD', 'SAMP', 'TITLE', 'HEAD', 'SVG', 'IMG', 'CANVAS',
	'VIDEO', 'AUDIO', 'IFRAME', 'OBJECT', 'MATH',
	// furigana: a reading over the text, not text to read
	'RT', 'RP',
]);

/** Elements that end a run of text (words aren't joined across them: furigana runs stay inside). */
export const BLOCK_SELECTOR = 'p, div, li, dd, dt, td, th, h1, h2, h3, h4, h5, h6, blockquote, figcaption, caption, section, article, header, footer, main, aside, nav, body';

/** Hiragana, katakana, CJK ideographs and halfwidth kana. */
const JAPANESE_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;

let segmenter: TinySegmenter | null = null;
function getSegmenter(): TinySegmenter {
	if (!segmenter) segmenter = new TinySegmenter();
	return segmenter;
}

function uniqueChars(...groups: string[]): string {
	const set = new Set<string>();
	for (const group of groups) {
		for (const char of group) set.add(char);
	}
	return Array.from(set).join('');
}

function stageKeyToSrsStage(stageKey: SrsStageKey): number | null {
	return stageKey === 'locked' ? null : Number(stageKey);
}

export class KanjiHighlighter {
	private readonly config: HighlightConfig;
	private readonly renderer: HighlightRenderer | null;
	/** which matches a paragraph's language lets through (textLanguage.ts); none: all of them */
	private readonly gate: LanguageGate | null;
	private readonly highlightedItems = new Map<string, HighlightedItem>();

	// Learned mode.
	private readonly learnedCharSet: Set<string>;

	// SRS stage mode.
	private readonly charStageMap = new Map<string, SrsStageKey>();
	private readonly wordStageMap = new Map<string, SrsStageKey>();

	// JLPT / Jōyō grade mode (kanji, and words: their grades come with the highlight data).
	private readonly charJlptMap = new Map<string, JlptGradeKey>();
	private readonly charJoyoMap = new Map<string, JoyoGradeKey>();
	private readonly wordGradeMap = new Map<string, SchoolGradeKey>();

	// Kanji target.
	private readonly splitRegex: RegExp | null = null;
	private readonly testRegex: RegExp | null = null;

	// Vocabulary target.
	private readonly learnedWordSet: Set<string>;
	private readonly activeWordSet: Set<string> = new Set();
	private readonly maxWordLength: number = 0;
	/** conjugated verbs / adjectives → their word */
	private readonly conjugations: ConjugationMatcher;

	/** Without a renderer, matches are wrapped in spans (the page's text is split up). */
	constructor(config: HighlightConfig, renderer: HighlightRenderer | null = null, gate: LanguageGate | null = null) {
		this.config = config;
		this.renderer = renderer;
		this.gate = gate;
		this.learnedCharSet = new Set(config.learnedChars);
		this.learnedWordSet = new Set(config.learnedWords);

		const wantsKanji = config.target === 'kanji' || config.target === 'mixed';
		const wantsVocab = config.target === 'vocabulary' || config.target === 'mixed';

		if (config.colorBy === 'srs_stage') {
			for (const [stageKey, chars] of Object.entries(config.kanjiByStage ?? createEmptyKanjiByStage())) {
				for (const char of chars) this.charStageMap.set(char, stageKey as SrsStageKey);
			}
			for (const [stageKey, words] of Object.entries(config.vocabByStage ?? createEmptyVocabByStage())) {
				for (const word of words) this.wordStageMap.set(word, stageKey as SrsStageKey);
			}
		}

		if (config.colorBy === 'jlpt') {
			for (const [gradeKey, chars] of Object.entries(config.kanjiByJlpt ?? {})) {
				for (const char of chars) this.charJlptMap.set(char, gradeKey as JlptGradeKey);
			}
		}

		if (config.colorBy === 'joyo') {
			for (const [gradeKey, chars] of Object.entries(config.kanjiByJoyo ?? {})) {
				for (const char of chars) this.charJoyoMap.set(char, gradeKey as JoyoGradeKey);
			}
		}

		if (config.colorBy === 'jlpt' || config.colorBy === 'joyo') {
			const byGrade = (config.colorBy === 'jlpt' ? config.vocabByJlpt : config.vocabByJoyo) ?? {};
			for (const [gradeKey, words] of Object.entries(byGrade)) {
				for (const word of words as string[]) if (word) this.wordGradeMap.set(word, gradeKey as SchoolGradeKey);
			}
		}

		if (wantsKanji) {
			let activeChars = '';
			if (config.colorBy === 'srs_stage') {
				activeChars = uniqueChars(...Object.values(config.kanjiByStage ?? {}));
			} else if (config.colorBy === 'jlpt') {
				activeChars = uniqueChars(...Object.values(config.kanjiByJlpt ?? {}));
			} else if (config.colorBy === 'joyo') {
				activeChars = uniqueChars(...Object.values(config.kanjiByJoyo ?? {}));
			} else {
				activeChars = uniqueChars(
					config.highlightLearned ? config.learnedChars : '',
					config.highlightNotLearned ? config.notLearnedChars : '',
				);
			}
			if (activeChars.length) {
				// escaped: a stray ] \ ^ or - in the data would make the class invalid (no highlights
				// at all) or a range
				const charClass = `[${activeChars.replace(/[\\\]\[^-]/g, '\\$&')}]`;
				this.splitRegex = new RegExp(charClass, 'g');
				this.testRegex = new RegExp(charClass);
			}
		}

		if (wantsVocab) {
			if (config.colorBy === 'srs_stage') {
				for (const words of Object.values(config.vocabByStage ?? {})) {
					for (const word of words) if (word) this.activeWordSet.add(word);
				}
			} else if (config.colorBy === 'jlpt' || config.colorBy === 'joyo') {
				// only the words with a level / grade (the others: their kanji, in mixed mode)
				for (const word of this.wordGradeMap.keys()) this.activeWordSet.add(word);
			} else {
				if (config.highlightLearned) {
					for (const word of config.learnedWords) if (word) this.activeWordSet.add(word);
				}
				if (config.highlightNotLearned) {
					for (const word of config.notLearnedWords) if (word) this.activeWordSet.add(word);
				}
			}
			for (const word of this.activeWordSet) {
				if (word.length > this.maxWordLength) this.maxWordLength = word.length;
			}
		}
		this.conjugations = new ConjugationMatcher(
			wantsVocab ? config.wordInflections : undefined,
			word => this.activeWordSet.has(word),
		);
	}

	isActive(): boolean {
		return this.splitRegex !== null || this.activeWordSet.size > 0;
	}

	getCount(): number {
		return this.highlightedItems.size;
	}

	getHighlighted(): HighlightedItem[] {
		return Array.from(this.highlightedItems.values());
	}

	hasMatch(text: string): boolean {
		if (this.config.target === 'kanji') return this.testRegex ? this.testRegex.test(text) : false;
		if (this.activeWordSet.size > 0) return JAPANESE_REGEX.test(text);
		return this.testRegex ? this.testRegex.test(text) : false;
	}

	highlightRoot(root: Node): void {
		if (!this.isActive()) return;

		if (root.nodeType === Node.TEXT_NODE) {
			const parent = root.parentElement;
			if (parent && this.isSkippable(parent)) return;
			this.wrapTextNode(root as Text);
			return;
		}

		const element = root.nodeType === Node.ELEMENT_NODE ? (root as Element) : root.parentElement;
		if (element && this.isSkippable(element)) return;

		// words over furigana: the text around <ruby> read as one (painted highlights only, which
		// can span nodes); a ruby on its own (observed by itself): its whole block instead
		if (this.renderer?.renderRun && this.config.target !== 'kanji' && this.activeWordSet.size) {
			const ruby = element?.closest('ruby');
			const block = ruby ? ruby.parentElement?.closest(BLOCK_SELECTOR) ?? ruby : root;
			for (const run of this.textRuns(block)) this.highlightRun(run);
			return;
		}

		const walker = document.createTreeWalker(
			root,
			NodeFilter.SHOW_TEXT,
			{ acceptNode: node => this.acceptTextNode(node as Text) },
		);

		const targets: Text[] = [];
		let current = walker.nextNode();
		while (current) {
			targets.push(current as Text);
			current = walker.nextNode();
		}

		for (const node of targets) this.wrapTextNode(node);
	}

	/**
	 * The text nodes under `root`, in runs: a node joins the one before it when either is in a
	 * <ruby> (its base; the furigana is skipped) and they're in the same block, with nothing
	 * else between them. 奈良県<ruby>話<rt>はな</rt></ruby>していました: 話 + していました.
	 */
	private textRuns(root: Node): Text[][] {
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
			acceptNode: node => {
				const parent = node.parentElement;
				if (!parent || this.isSkippable(parent) || !node.nodeValue) return NodeFilter.FILTER_REJECT;
				return NodeFilter.FILTER_ACCEPT;
			},
		});
		const runs: Text[][] = [];
		let run: Text[] = [];
		let previous: Text | null = null;
		for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
			const joins = previous
				&& (previous.parentElement?.closest('ruby') || node.parentElement?.closest('ruby'))
				&& previous.parentElement?.closest(BLOCK_SELECTOR) === node.parentElement?.closest(BLOCK_SELECTOR);
			if (!joins && run.length) {
				runs.push(run);
				run = [];
			}
			run.push(node);
			previous = node;
		}
		if (run.length) runs.push(run);
		return runs;
	}

	/** A run of text nodes: matched as one text (a single node: as before). */
	private highlightRun(nodes: Text[]): void {
		if (nodes.length === 1) {
			if (this.hasMatch(nodes[0].nodeValue ?? '')) this.wrapTextNode(nodes[0]);
			return;
		}
		const text = nodes.map(node => node.nodeValue ?? '').join('');
		const matches = this.hasMatch(text) ? this.allowed(nodes, text, this.findMatches(text)) : [];
		for (const match of matches) this.recordItem(match);
		this.renderer!.renderRun!(nodes, matches);
	}

	private acceptTextNode(node: Text): number {
		const parent = node.parentElement;
		if (!parent) return NodeFilter.FILTER_REJECT;
		if (this.isSkippable(parent)) return NodeFilter.FILTER_REJECT;

		const text = node.nodeValue;
		if (!text || !this.hasMatch(text)) return NodeFilter.FILTER_REJECT;
		return NodeFilter.FILTER_ACCEPT;
	}

	private isSkippable(element: Element): boolean {
		if (UNWANTED_TAGS.has(element.tagName)) return true;
		if ((element as HTMLElement).isContentEditable) return true;
		if (element.classList.contains(HIGHLIGHT_MARK_CLASS)) return true;
		if (element.classList.contains('sd-focusPopup_kanji')) return true;
		if (element.closest('.sd-focusPopup_kanji, .sd-compactPopup_body')) return true;
		if (element.closest('.sd-detailsPopup_sectionContainer .tiles-list, .sd-relatedGrid')) return true;
		// the handwriting sheet is SVG (tagName is lowercase there, so UNWANTED_TAGS misses it)
		if (element.closest('.sd-hw-sheet')) return true;
		return false;
	}

	private wrapTextNode(node: Text): void {
		const text = node.nodeValue;
		if (!text) return;

		const matches = this.allowed([node], text, this.findMatches(text));
		for (const match of matches) this.recordItem(match);
		if (this.renderer) {
			// even without matches: the text may have changed, and its old highlights must go
			this.renderer.render(node, matches);
			return;
		}
		if (matches.length) this.wrapWithSpans(node, text, matches);
	}

	/** The matches the paragraph's language lets through (Chinese text, say, may be left alone). */
	private allowed(nodes: Text[], text: string, matches: HighlightMatch[]): HighlightMatch[] {
		return this.gate ? this.gate.filter(nodes, text, matches) : matches;
	}

	/** The kanji / words to highlight in a piece of text. */
	findMatches(text: string): HighlightMatch[] {
		if (this.config.target === 'kanji') return this.kanjiMatches(text, 0);
		if (this.config.target === 'vocabulary') return this.wordMatches(text, false);
		if (this.activeWordSet.size > 0) return this.wordMatches(text, true);
		return this.kanjiMatches(text, 0);
	}

	private kanjiMeta(char: string): MatchMeta | null {
		if (this.config.colorBy === 'srs_stage') {
			return { mode: 'srs_stage', stageKey: this.charStageMap.get(char) ?? 'locked' };
		}
		if (this.config.colorBy === 'jlpt') {
			const gradeKey = this.charJlptMap.get(char);
			if (!gradeKey) return null;
			return { mode: 'jlpt', gradeKey };
		}
		if (this.config.colorBy === 'joyo') {
			const gradeKey = this.charJoyoMap.get(char);
			if (!gradeKey) return null;
			return { mode: 'joyo', gradeKey };
		}
		return { mode: 'learned', learned: this.learnedCharSet.has(char) };
	}

	private vocabMeta(word: string): MatchMeta {
		if (this.config.colorBy === 'srs_stage') {
			return { mode: 'srs_stage', stageKey: this.wordStageMap.get(word) ?? 'locked' };
		}
		if (this.config.colorBy === 'jlpt') {
			return { mode: 'jlpt', gradeKey: this.wordGradeMap.get(word) as JlptGradeKey };
		}
		if (this.config.colorBy === 'joyo') {
			return { mode: 'joyo', gradeKey: this.wordGradeMap.get(word) as JoyoGradeKey };
		}
		return { mode: 'learned', learned: this.learnedWordSet.has(word) };
	}

	/** Remember what's highlighted on the page (the popup's list, the badge). */
	private recordItem({ value, type, meta }: HighlightMatch): void {
		let item: HighlightedItem;
		if (meta.mode === 'srs_stage') {
			item = { value, type, srsStage: stageKeyToSrsStage(meta.stageKey) };
		} else if (meta.mode === 'jlpt' || meta.mode === 'joyo') {
			item = { value, type, schoolGrade: meta.gradeKey };
		} else {
			item = { value, type, learned: meta.learned };
		}
		this.highlightedItems.set(`${type}:${value}`, item);
	}

	/** `surface`: the text highlighted (a conjugated form: its word in an attribute) */
	private makeSpan({ value, type, meta }: HighlightMatch, surface: string): HTMLSpanElement {
		const span = document.createElement('span');
		span.setAttribute('data-wkh-type', type);
		span.textContent = surface;
		if (surface !== value) span.setAttribute(HIGHLIGHT_VALUE_ATTRIBUTE, value);

		if (meta.mode === 'srs_stage') {
			span.className = `${HIGHLIGHT_MARK_CLASS} ${this.config.srsStyleClass}`;
			span.setAttribute('data-wkh-srs', meta.stageKey);
			span.setAttribute('data-wkh', meta.stageKey === 'locked' ? 'locked' : `srs-${meta.stageKey}`);
		} else if (meta.mode === 'jlpt' || meta.mode === 'joyo') {
			span.className = `${HIGHLIGHT_MARK_CLASS} ${this.config.srsStyleClass}`;
			span.setAttribute('data-wkh-grade', meta.gradeKey);
			span.setAttribute('data-wkh', `${meta.mode}-${meta.gradeKey}`);
		} else {
			const cssClass = meta.learned ? this.config.learnedClass : this.config.notLearnedClass;
			span.className = `${HIGHLIGHT_MARK_CLASS} ${cssClass}`;
			span.setAttribute('data-wkh', meta.learned ? 'learned' : 'not-learned');
		}
		return span;
	}

	private wrapWithSpans(node: Text, text: string, matches: HighlightMatch[]): void {
		const fragment = document.createDocumentFragment();
		let lastIndex = 0;
		for (const match of matches) {
			if (match.start > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.start)));
			fragment.appendChild(this.makeSpan(match, text.slice(match.start, match.end)));
			lastIndex = match.end;
		}
		if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
		node.parentNode?.replaceChild(fragment, node);
	}

	/** Kanji in `text`; `offset`: where `text` starts in the text node. */
	private kanjiMatches(text: string, offset: number): HighlightMatch[] {
		if (!this.splitRegex) return [];
		const matches: HighlightMatch[] = [];
		this.splitRegex.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = this.splitRegex.exec(text)) !== null) {
			const char = match[0];
			const meta = this.kanjiMeta(char);
			if (meta) {
				const start = offset + match.index;
				matches.push({ start, end: start + char.length, value: char, type: 'kanji', meta });
			}
		}
		return matches;
	}

	/**
	 * Words (wordScan.ts: the longest runs of TinySegmenter tokens that are words, as written or
	 * conjugated); `kanjiFallback`: the kanji in between.
	 */
	private wordMatches(text: string, kanjiFallback: boolean): HighlightMatch[] {
		if (!JAPANESE_REGEX.test(text)) return [];

		const words = scanWords(text, getSegmenter().segment(text), {
			lookup: (run, couldConjugate) => (this.activeWordSet.has(run)
				? run
				: couldConjugate ? this.conjugations.match(run)?.word ?? '' : ''),
			couldConjugate: rest => this.conjugations.active && this.conjugations.couldStart(rest),
			limit: couldConjugate => this.maxWordLength + (couldConjugate ? MAX_CONJUGATION : 0),
		});

		const matches: HighlightMatch[] = [];
		let last = 0;
		const gap = (end: number) => {
			if (kanjiFallback && end > last) matches.push(...this.kanjiMatches(text.slice(last, end), last));
		};
		for (const { start, end, word } of words) {
			gap(start);
			matches.push({ start, end, value: word, type: 'vocabulary', meta: this.vocabMeta(word) });
			last = end;
		}
		gap(text.length);
		return matches;
	}
}

export function clearHighlights(root: ParentNode = document): void {
	const spans = root.querySelectorAll(`span.${HIGHLIGHT_MARK_CLASS}`);
	spans.forEach(span => {
		const parent = span.parentNode;
		if (!parent) return;
		parent.replaceChild(document.createTextNode(span.textContent ?? ''), span);
		parent.normalize();
	});
}
