/**
 * WaniKani's highlighting: what to highlight (KanjiMatcher) and how it looks, on the shared page
 * side (cjk-highlighter: which text, furigana, painting, Japanese or Chinese).
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
 *   - "jlpt" / "joyo": one color per level / grade
 *
 * Web pages paint the matches without touching the page (RangeHighlights); elsewhere (the
 * extension's own pages) each match is wrapped in a span.
 */

import TinySegmenter from 'tiny-segmenter';
import {
	PageHighlighter,
	SpanRenderer,
	clearSpans,
	type LanguageGate,
	type Match,
	type Matcher,
	type Renderer,
} from 'cjk-highlighter';
import {
	createEmptyKanjiByStage,
	createEmptyVocabByStage,
	type SrsStageKey,
} from './srsStageHighlight';
import type { JlptGradeKey, JoyoGradeKey, SchoolGradeKey } from './schoolGradeHighlight';
import { ConjugationMatcher } from './deinflect';
import { scanWords } from './wordScan';

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
 * A kanji / word to highlight (cjk-highlighter's Match): `value` is the WaniKani word (a
 * conjugated one's dictionary form: 話して → 話す), `data` how it's colored.
 */
export type HighlightMatch = Match<MatchMeta> & { type: 'kanji' | 'vocabulary' };

/** On a highlight span whose text is a conjugated form: the word it is (話して → 話す). */
export const HIGHLIGHT_VALUE_ATTRIBUTE = 'data-wkh-value';

/** The WaniKani word a highlight span is (its text, or the word its conjugated text is). */
export function highlightValueOf(span: Element): string {
	return (span.getAttribute(HIGHLIGHT_VALUE_ATTRIBUTE) ?? span.textContent ?? '').trim();
}

/** how much longer than its word a conjugated form may be (話していませんでした) */
const MAX_CONJUGATION = 10;

/** Which painted highlight (CSS ::highlight name) a match belongs to. */
export function highlightNameFor(meta: MatchMeta): string {
	if (meta.mode === 'srs_stage') return `wkh-srs-${meta.stageKey}`;
	if (meta.mode === 'jlpt' || meta.mode === 'joyo') return `wkh-${meta.mode}-${meta.gradeKey}`;
	return meta.learned ? 'wkh-learned' : 'wkh-not-learned';
}

/** Painted hover feedback (a span used to fade); above the colors. */
export const HOVER_HIGHLIGHT = 'wkh-hover';

/** Marker class shared by every highlighted span (used for cleanup + skip). */
export const HIGHLIGHT_MARK_CLASS = 'wkhighlighter_clickable';

/** Hiragana, katakana, CJK ideographs and halfwidth kana. */
const JAPANESE_REGEX = /[぀-ヿ㐀-䶿一-鿿豈-﫿ｦ-ﾟ]/;

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

/** The subject details' own parts (its big character, its tiles…): their text isn't highlighted. */
function isDetailsChrome(element: Element): boolean {
	if (element.classList.contains('sd-focusPopup_kanji')) return true;
	if (element.closest('.sd-focusPopup_kanji, .sd-compactPopup_body')) return true;
	if (element.closest('.sd-detailsPopup_sectionContainer .tiles-list, .sd-relatedGrid')) return true;
	// the handwriting sheet is SVG
	return Boolean(element.closest('.sd-hw-sheet'));
}

/** What WaniKani highlights in a text: its kanji, its words (conjugated too), by the settings. */
export class KanjiMatcher implements Matcher<MatchMeta> {
	private readonly config: HighlightConfig;

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

	constructor(config: HighlightConfig) {
		this.config = config;
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

	/** words over furigana are matched across its nodes */
	get matchesRuns(): boolean {
		return this.config.target !== 'kanji' && this.activeWordSet.size > 0;
	}

	hasMatch(text: string): boolean {
		if (this.config.target === 'kanji') return this.testRegex ? this.testRegex.test(text) : false;
		if (this.activeWordSet.size > 0) return JAPANESE_REGEX.test(text);
		return this.testRegex ? this.testRegex.test(text) : false;
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

	private match(start: number, end: number, value: string, type: 'kanji' | 'vocabulary', meta: MatchMeta): HighlightMatch {
		return { start, end, value, type, name: highlightNameFor(meta), data: meta };
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
				matches.push(this.match(start, start + char.length, char, 'kanji', meta));
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
			matches.push(this.match(start, end, word, 'vocabulary', this.vocabMeta(word)));
			last = end;
		}
		gap(text.length);
		return matches;
	}
}

/** A highlight span (extension pages, and browsers that can't paint highlights). */
function makeSpan(config: HighlightConfig, { value, type, data: meta }: HighlightMatch, surface: string): HTMLSpanElement {
	const span = document.createElement('span');
	span.setAttribute('data-wkh-type', type);
	span.textContent = surface;
	if (surface !== value) span.setAttribute(HIGHLIGHT_VALUE_ATTRIBUTE, value);

	if (meta.mode === 'srs_stage') {
		span.className = `${HIGHLIGHT_MARK_CLASS} ${config.srsStyleClass}`;
		span.setAttribute('data-wkh-srs', meta.stageKey);
		span.setAttribute('data-wkh', meta.stageKey === 'locked' ? 'locked' : `srs-${meta.stageKey}`);
	} else if (meta.mode === 'jlpt' || meta.mode === 'joyo') {
		span.className = `${HIGHLIGHT_MARK_CLASS} ${config.srsStyleClass}`;
		span.setAttribute('data-wkh-grade', meta.gradeKey);
		span.setAttribute('data-wkh', `${meta.mode}-${meta.gradeKey}`);
	} else {
		const cssClass = meta.learned ? config.learnedClass : config.notLearnedClass;
		span.className = `${HIGHLIGHT_MARK_CLASS} ${cssClass}`;
		span.setAttribute('data-wkh', meta.learned ? 'learned' : 'not-learned');
	}
	return span;
}

/**
 * WaniKani's highlighter: its matcher on the shared page side, and what it has highlighted (the
 * popup's list, the badge).
 */
export class KanjiHighlighter {
	readonly matcher: KanjiMatcher;
	readonly page: PageHighlighter<MatchMeta>;
	private readonly highlightedItems = new Map<string, HighlightedItem>();

	/** Without a renderer, matches are wrapped in spans (the page's text is split up). */
	constructor(config: HighlightConfig, renderer: Renderer<MatchMeta> | null = null, gate: LanguageGate | null = null) {
		this.matcher = new KanjiMatcher(config);
		this.page = new PageHighlighter<MatchMeta>(
			this.matcher,
			renderer ?? new SpanRenderer<MatchMeta>((match, surface) => makeSpan(config, match as HighlightMatch, surface), HIGHLIGHT_MARK_CLASS),
			{ gate, skip: isDetailsChrome, onMatch: match => this.recordItem(match as HighlightMatch) },
		);
	}

	isActive(): boolean {
		return this.matcher.isActive();
	}

	getCount(): number {
		return this.highlightedItems.size;
	}

	getHighlighted(): HighlightedItem[] {
		return Array.from(this.highlightedItems.values());
	}

	hasMatch(text: string): boolean {
		return this.matcher.hasMatch(text);
	}

	highlightRoot(root: Node): void {
		this.page.highlightRoot(root);
	}

	findMatches(text: string): HighlightMatch[] {
		return this.matcher.findMatches(text);
	}

	/** Remember what's highlighted on the page (the popup's list, the badge). */
	private recordItem({ value, type, data: meta }: HighlightMatch): void {
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
}

export function clearHighlights(root: ParentNode = document): void {
	clearSpans(HIGHLIGHT_MARK_CLASS, root);
}
