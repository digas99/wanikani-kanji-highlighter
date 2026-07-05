/**
 * DOM highlighter for WaniKani kanji and vocabulary.
 *
 * Two targets are supported:
 *   - "kanji":      wraps individual learned / not-learned kanji characters.
 *   - "vocabulary": tokenizes Japanese text with TinySegmenter and wraps runs of
 *                   tokens that match a known WaniKani vocabulary word
 *                   (greedy longest match).
 *
 * Coloring modes:
 *   - "learned":    learned vs not-yet-learned (two colors / styles)
 *   - "srs_stage":  one color per SRS stage (Initiate through Burned, plus Locked)
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
	kanjiByStage: Record<SrsStageKey, string>;
	vocabByStage: Record<SrsStageKey, string[]>;
	kanjiByJlpt: Record<JlptGradeKey, string>;
	kanjiByJoyo: Record<JoyoGradeKey, string>;
	stageColors: Record<SrsStageKey, string>;
	gradeColors: Record<SchoolGradeKey, string>;
	learnedClass: string;
	notLearnedClass: string;
	srsStyleClass: string;
	highlightLearned: boolean;
	highlightNotLearned: boolean;
};

type SpanMeta =
	| { mode: 'learned'; learned: boolean }
	| { mode: 'srs_stage'; stageKey: SrsStageKey }
	| { mode: 'jlpt'; gradeKey: JlptGradeKey }
	| { mode: 'joyo'; gradeKey: JoyoGradeKey };

/** Marker class shared by every highlighted span (used for cleanup + skip). */
export const HIGHLIGHT_MARK_CLASS = 'wkhighlighter_clickable';

/** Tags whose text content must never be touched. */
const UNWANTED_TAGS = new Set([
	'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION',
	'CODE', 'PRE', 'KBD', 'SAMP', 'TITLE', 'HEAD', 'SVG', 'IMG', 'CANVAS',
	'VIDEO', 'AUDIO', 'IFRAME', 'OBJECT', 'MATH',
]);

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
	private readonly highlightedItems = new Map<string, HighlightedItem>();

	// Learned mode.
	private readonly learnedCharSet: Set<string>;

	// SRS stage mode.
	private readonly charStageMap = new Map<string, SrsStageKey>();
	private readonly wordStageMap = new Map<string, SrsStageKey>();

	// JLPT / Jōyō grade mode (kanji only).
	private readonly charJlptMap = new Map<string, JlptGradeKey>();
	private readonly charJoyoMap = new Map<string, JoyoGradeKey>();

	// Kanji target.
	private readonly splitRegex: RegExp | null = null;
	private readonly testRegex: RegExp | null = null;

	// Vocabulary target.
	private readonly learnedWordSet: Set<string>;
	private readonly activeWordSet: Set<string> = new Set();
	private readonly maxWordLength: number = 0;

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
				const charClass = `[${activeChars}]`;
				this.splitRegex = new RegExp(charClass, 'g');
				this.testRegex = new RegExp(charClass);
			}
		}

		if (wantsVocab) {
			if (config.colorBy === 'srs_stage') {
				for (const words of Object.values(config.vocabByStage ?? {})) {
					for (const word of words) if (word) this.activeWordSet.add(word);
				}
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
		if (element.closest('.sd-detailsPopup_sectionContainer .tiles-list')) return true;
		return false;
	}

	private wrapTextNode(node: Text): void {
		const text = node.nodeValue;
		if (!text) return;

		if (this.config.target === 'kanji') {
			this.wrapKanji(node, text);
		} else if (this.config.target === 'vocabulary') {
			this.wrapSegmented(node, text, false);
		} else if (this.activeWordSet.size > 0) {
			this.wrapSegmented(node, text, true);
		} else {
			this.wrapKanji(node, text);
		}
	}

	private kanjiMeta(char: string): SpanMeta | null {
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

	private vocabMeta(word: string): SpanMeta {
		if (this.config.colorBy === 'srs_stage') {
			return { mode: 'srs_stage', stageKey: this.wordStageMap.get(word) ?? 'locked' };
		}
		return { mode: 'learned', learned: this.learnedWordSet.has(word) };
	}

	private makeSpan(value: string, type: 'kanji' | 'vocabulary', meta: SpanMeta): HTMLSpanElement {
		const span = document.createElement('span');
		span.setAttribute('data-wkh-type', type);
		span.textContent = value;

		let item: HighlightedItem;

		if (meta.mode === 'srs_stage') {
			span.className = `${HIGHLIGHT_MARK_CLASS} ${this.config.srsStyleClass}`;
			span.setAttribute('data-wkh-srs', meta.stageKey);
			span.setAttribute('data-wkh', meta.stageKey === 'locked' ? 'locked' : `srs-${meta.stageKey}`);
			item = {
				value,
				type,
				srsStage: stageKeyToSrsStage(meta.stageKey),
			};
		} else if (meta.mode === 'jlpt' || meta.mode === 'joyo') {
			span.className = `${HIGHLIGHT_MARK_CLASS} ${this.config.srsStyleClass}`;
			span.setAttribute('data-wkh-grade', meta.gradeKey);
			span.setAttribute('data-wkh', `${meta.mode}-${meta.gradeKey}`);
			item = {
				value,
				type,
				schoolGrade: meta.gradeKey,
			};
		} else {
			const cssClass = meta.learned ? this.config.learnedClass : this.config.notLearnedClass;
			span.className = `${HIGHLIGHT_MARK_CLASS} ${cssClass}`;
			span.setAttribute('data-wkh', meta.learned ? 'learned' : 'not-learned');
			item = { value, type, learned: meta.learned };
		}

		this.highlightedItems.set(`${type}:${value}`, item);
		return span;
	}

	private wrapKanji(node: Text, text: string): void {
		if (!this.splitRegex) return;
		const fragment = document.createDocumentFragment();
		if (this.appendKanji(fragment, text)) node.parentNode?.replaceChild(fragment, node);
	}

	private appendKanji(fragment: DocumentFragment, text: string): boolean {
		if (!this.splitRegex) {
			fragment.appendChild(document.createTextNode(text));
			return false;
		}

		this.splitRegex.lastIndex = 0;
		let lastIndex = 0;
		let matched = false;
		let match: RegExpExecArray | null;

		while ((match = this.splitRegex.exec(text)) !== null) {
			matched = true;
			const char = match[0];
			if (match.index > lastIndex) {
				fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
			}
			const meta = this.kanjiMeta(char);
			if (meta) {
				fragment.appendChild(this.makeSpan(char, 'kanji', meta));
			} else {
				fragment.appendChild(document.createTextNode(char));
			}
			lastIndex = match.index + char.length;
		}

		if (lastIndex < text.length) {
			fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
		}
		return matched;
	}

	private wrapSegmented(node: Text, text: string, kanjiFallback: boolean): void {
		if (!JAPANESE_REGEX.test(text)) return;

		const tokens = getSegmenter().segment(text);
		const fragment = document.createDocumentFragment();
		let buffer = '';
		let matched = false;

		const flushBuffer = () => {
			if (!buffer) return;
			if (kanjiFallback) {
				if (this.appendKanji(fragment, buffer)) matched = true;
			} else {
				fragment.appendChild(document.createTextNode(buffer));
			}
			buffer = '';
		};

		let i = 0;
		while (i < tokens.length) {
			let bestLength = 0;
			let bestWord = '';
			let combined = '';
			for (let j = i; j < tokens.length; j++) {
				combined += tokens[j];
				if (combined.length > this.maxWordLength) break;
				if (this.activeWordSet.has(combined)) {
					bestLength = j - i + 1;
					bestWord = combined;
				}
			}

			if (bestLength > 0) {
				flushBuffer();
				fragment.appendChild(this.makeSpan(bestWord, 'vocabulary', this.vocabMeta(bestWord)));
				matched = true;
				i += bestLength;
			} else {
				buffer += tokens[i];
				i += 1;
			}
		}

		flushBuffer();

		if (!matched) return;
		node.parentNode?.replaceChild(fragment, node);
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
