/**
 * Is a paragraph Japanese or Chinese? Both write with the same characters, so it's told from
 * what only one of them uses:
 *   - Japanese: kana (and 々 〆).
 *   - Chinese:  hanzi Japanese doesn't use (not Jōyō, Jinmeiyō or WaniKani's: 这 们 说 時→时,
 *               會 來…), and the function words Chinese writes in hanzi (的 了 是 很 吗 呢 你…).
 * Text with only the characters both share (東京大学 on its own) is unclear: it takes its
 * context (a lang attribute, the page's other paragraphs), else the user's choice.
 *
 * The highlighter asks a LanguageGate which of a paragraph's matches to paint (highlighter.ts).
 */

import { BLOCK_SELECTOR, type HighlightMatch } from './highlighter';
import { matchesSiteList } from '@/utils/scripts/pageList';

export type TextLanguage = 'japanese' | 'chinese' | 'mixed' | 'unclear';
export type LanguageChoice = 'highlight' | 'skip';

export type LanguageSignals = {
	/** hiragana, katakana (not ー or ・, which Chinese text uses too), 々 〆 */
	kana: number;
	/** hanzi / kanji */
	han: number;
	/** hanzi Japanese doesn't use */
	chineseOnly: number;
	/** hanzi Chinese writes its function words with */
	chineseFunction: number;
};

/** Chinese function words, written in hanzi (Japanese writes its own in kana). */
const CHINESE_FUNCTION = new Set([...'的了是很吗嗎呢吧们們这這么麼没沒她你我哪什怎说說还还过给']);

function isKana(code: number): boolean {
	return (code >= 0x3041 && code <= 0x309f) // hiragana
		|| (code >= 0x30a1 && code <= 0x30fa) // katakana (not ・ ー)
		|| (code >= 0x30fd && code <= 0x30ff)
		|| (code >= 0xff66 && code <= 0xff9d) // halfwidth katakana
		|| code === 0x3005 || code === 0x3006; // 々 〆
}

function isHan(code: number): boolean {
	return (code >= 0x4e00 && code <= 0x9fff)
		|| (code >= 0x3400 && code <= 0x4dbf)
		|| (code >= 0xf900 && code <= 0xfaff);
}

/** `japaneseKanji`: the kanji Japanese uses (an empty set: none counts as Chinese-only). */
export function countSignals(text: string, japaneseKanji: Set<string>): LanguageSignals {
	const signals: LanguageSignals = { kana: 0, han: 0, chineseOnly: 0, chineseFunction: 0 };
	for (const char of text) {
		const code = char.codePointAt(0)!;
		if (isKana(code)) {
			signals.kana += 1;
		} else if (isHan(code)) {
			signals.han += 1;
			if (CHINESE_FUNCTION.has(char)) signals.chineseFunction += 1;
			else if (japaneseKanji.size && !japaneseKanji.has(char)) signals.chineseOnly += 1;
		}
	}
	return signals;
}

/** What the signals say, each language on its own. */
function signalsFor({ kana, han, chineseOnly, chineseFunction }: LanguageSignals): { japanese: boolean; chinese: boolean } {
	// a short text: one kana is enough (首相、衆院解散を表明); a long one needs more (a stray の)
	const japanese = kana >= 2 || (kana >= 1 && han <= 12);
	// a rare kanji in a Japanese name or title (島嶼, 富嶽) isn't enough: a share of the text is
	const chineseSigns = chineseOnly + chineseFunction;
	const chinese = chineseFunction >= 2 || chineseSigns >= 4 || (chineseSigns >= 2 && chineseSigns / Math.max(han, 1) >= 0.15);
	return { japanese, chinese };
}

/** The language the signals point to, as one piece of text; null: no kana or hanzi at all. */
export function languageOfSignals(signals: LanguageSignals): TextLanguage | null {
	const { kana, han, chineseOnly, chineseFunction } = signals;
	if (!kana && !han) return null;
	const { japanese, chinese } = signalsFor(signals);
	if (japanese && !chinese) return 'japanese';
	if (chinese && !japanese) return 'chinese';
	if (!japanese && !chinese) return 'unclear';
	// both: Japanese prose has a 的 (具体的) or a rare kanji now and then; Chinese, a Japanese name
	const kanaShare = kana / (kana + han);
	const chineseShare = (chineseOnly + chineseFunction) / Math.max(han, 1);
	// a quarter kana: Japanese prose (薔薇の花が咲いている), whatever its kanji
	if (kanaShare >= 0.25) return 'japanese';
	if (kanaShare >= 0.1 && chineseShare < 0.1) return 'japanese';
	if (kanaShare < 0.1 && chineseShare >= 0.1) return 'chinese';
	return 'mixed';
}

/**
 * A paragraph's language. With signs of both, by sentence: mixed only when some sentences are
 * Japanese and others Chinese (a quote); else the language they agree on.
 */
export function classifyText(text: string, japaneseKanji: Set<string>, signals = countSignals(text, japaneseKanji)): TextLanguage | null {
	const { japanese, chinese } = signalsFor(signals);
	const whole = languageOfSignals(signals);
	if (!japanese || !chinese) return whole;
	let hasJapanese = false;
	let hasChinese = false;
	for (const [start, end] of sentenceRanges(text)) {
		const sentence = languageOfSignals(countSignals(text.slice(start, end), japaneseKanji));
		if (sentence === 'japanese') hasJapanese = true;
		if (sentence === 'chinese') hasChinese = true;
	}
	if (hasJapanese && hasChinese) return 'mixed';
	if (hasJapanese) return 'japanese';
	if (hasChinese) return 'chinese';
	return whole;
}

/** Sentences, by position: up to (and with) their 。！？!? or line break. */
export function sentenceRanges(text: string): Array<[number, number]> {
	const ranges: Array<[number, number]> = [];
	const pattern = /[^。！？!?\n]+[。！？!?\n]*|[。！？!?\n]+/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(text)) !== null) ranges.push([match.index, match.index + match[0].length]);
	return ranges;
}

/** Tags whose text isn't the paragraph's (as the highlighter skips them). */
const SKIPPED_TAGS = new Set([
	'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE', 'KBD',
	'SAMP', 'TITLE', 'HEAD', 'SVG', 'IMG', 'CANVAS', 'VIDEO', 'AUDIO', 'IFRAME', 'OBJECT', 'MATH', 'RT', 'RP',
]);

/** a paragraph's text read to classify it (enough to tell; a huge one isn't read whole) */
const MAX_PARAGRAPH_TEXT = 3000;
/** the page's text read up front, to know its language before its paragraphs are highlighted */
const MAX_SEED_TEXT = 40_000;
/** how much decided text a language needs, and its lead over the other, to be the page's */
const PAGE_MIN_CHARS = 20;
const PAGE_LEAD = 2;

/** The page's language from its decided text (each language's kana and hanzi), if one clearly leads. */
function leadingLanguage(japanese: number, chinese: number): 'japanese' | 'chinese' | null {
	if (japanese >= PAGE_MIN_CHARS && japanese >= chinese * PAGE_LEAD) return 'japanese';
	if (chinese >= PAGE_MIN_CHARS && chinese >= japanese * PAGE_LEAD) return 'chinese';
	return null;
}

/** A paragraph: its block element (p, li, div…; a custom element too: YouTube's comments are). */
function isBlock(element: Element): boolean {
	return element.tagName.includes('-') || element.matches(BLOCK_SELECTOR);
}

export function paragraphOf(node: Node): Element | null {
	for (let element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement; element; element = element.parentElement) {
		if (isBlock(element)) return element;
	}
	return null;
}

/** A paragraph's own text: not its nested paragraphs' (they're classified on their own). */
function ownText(block: Element): string {
	const walker = document.createTreeWalker(block, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
		acceptNode: node => {
			if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
			const element = node as Element;
			if (SKIPPED_TAGS.has(element.tagName.toUpperCase()) || isBlock(element)) return NodeFilter.FILTER_REJECT;
			return NodeFilter.FILTER_SKIP;
		},
	});
	let text = '';
	for (let node = walker.nextNode(); node && text.length < MAX_PARAGRAPH_TEXT; node = walker.nextNode()) {
		text += node.nodeValue ?? '';
	}
	return text;
}

/** A lang attribute that says Japanese or Chinese (others, like en, say nothing about this). */
export function languageOfAttribute(element: Element): 'japanese' | 'chinese' | null {
	const lang = element.closest('[lang]')?.getAttribute('lang')?.toLowerCase() ?? '';
	if (lang.startsWith('ja')) return 'japanese';
	if (lang.startsWith('zh')) return 'chinese';
	return null;
}

export type LanguageGateOptions = {
	/** the kanji Japanese uses (Jōyō, Jinmeiyō, WaniKani's) */
	japaneseKanji: Set<string>;
	chinese: LanguageChoice;
	/** what's done with unclear text when its page doesn't tell (this site's, exceptions applied) */
	unclear: LanguageChoice;
	/** the page's language became clear: the paragraphs decided without it, to redo */
	onPageLanguage?: (paragraphs: Element[]) => void;
	/** keep each paragraph's class, for summary() (development: languageDebug.ts) */
	track?: boolean;
};

export type LanguageSummary = {
	page: 'japanese' | 'chinese' | null;
	/** the page's lang, when it says Japanese or Chinese */
	declared: 'japanese' | 'chinese' | null;
	/** the decided text, by language (kana and hanzi) */
	tally: { japanese: number; chinese: number };
	/** paragraphs, by class */
	paragraphs: Record<TextLanguage, number>;
	/** the unclear ones decided by the choice (the page didn't tell) */
	byChoice: number;
	chinese: LanguageChoice;
	unclear: LanguageChoice;
};

type ParagraphEntry = { language: TextLanguage | null; weight: number };

/**
 * Which matches of a paragraph to highlight, by its language. Paragraphs are classified once
 * (again after they change: forget()), and together they tell the page's language.
 */
/** The page's highlight gate, while one runs: what's read (pageStatsBar.ts) takes its page language. */
let activeGate: LanguageGate | null = null;
const pageLanguageListeners = new Set<() => void>();

function notifyPageLanguage(): void {
	for (const listener of pageLanguageListeners) listener();
}

/**
 * The page's language as the highlight found it: from all its paragraphs, hidden ones too (a
 * menu at another width). Undefined: no highlight gate here.
 */
export function activePageLanguage(): 'japanese' | 'chinese' | null | undefined {
	return activeGate ? activeGate.currentPageLanguage() : undefined;
}

/** Called when the highlight's page language changes (or its gate comes or goes). */
export function onPageLanguageChange(listener: () => void): () => void {
	pageLanguageListeners.add(listener);
	return () => pageLanguageListeners.delete(listener);
}

export class LanguageGate {
	private readonly options: LanguageGateOptions;
	private readonly paragraphs = new WeakMap<Element, ParagraphEntry>();
	/** the page's decided text, by language (its paragraphs' kana and hanzi) */
	private readonly tally = { japanese: 0, chinese: 0 };
	private pageLanguage: 'japanese' | 'chinese' | null = null;
	/** unclear paragraphs decided by the user's choice, while the page's language wasn't known */
	private provisional = new Set<Element>();
	private notifyTimer: number | null = null;
	/** each paragraph's class (only with `track`) */
	private readonly tracked = new Map<Element, TextLanguage | null>();

	constructor(options: LanguageGateOptions) {
		this.options = options;
		activeGate = this;
		window.setTimeout(notifyPageLanguage, 0);
	}

	/** Without anything to leave out, there's nothing to classify. */
	static needed(chinese: LanguageChoice, unclear: LanguageChoice): boolean {
		return chinese === 'skip' || unclear === 'skip';
	}

	/** The page's language, before highlighting: its first paragraphs, classified. */
	seed(root: Element): void {
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
			acceptNode: node => {
				if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
				return SKIPPED_TAGS.has((node as Element).tagName.toUpperCase()) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
			},
		});
		let read = 0;
		for (let node = walker.nextNode(); node && read < MAX_SEED_TEXT; node = walker.nextNode()) {
			const text = node.nodeValue ?? '';
			if (!text.trim()) continue;
			read += text.length;
			const paragraph = paragraphOf(node);
			if (paragraph) this.languageOf(paragraph);
		}
	}

	/** The paragraph changed (its text, its children): classified again next time. */
	forget(node: Node): void {
		const paragraph = paragraphOf(node);
		const entry = paragraph && this.paragraphs.get(paragraph);
		if (!paragraph || !entry) return;
		this.count(entry, -1);
		this.paragraphs.delete(paragraph);
	}

	/** The matches of these text nodes (one, or a run: furigana) to highlight. */
	filter(nodes: Text[], text: string, matches: HighlightMatch[]): HighlightMatch[] {
		if (!matches.length) return matches;
		const paragraph = paragraphOf(nodes[0]);
		const language = paragraph
			? this.languageOf(paragraph)
			: classifyText(text, this.options.japaneseKanji);
		if (language !== 'mixed') return this.allows(language, paragraph) ? matches : [];

		// both languages: sentence by sentence (a Japanese quote in a Chinese paragraph)
		const allowed = sentenceRanges(text).map(([start, end]) => {
			const sentence = classifyText(text.slice(start, end), this.options.japaneseKanji);
			return { start, end, allowed: this.allows(sentence === 'mixed' ? 'japanese' : sentence, paragraph) };
		});
		return matches.filter(match => allowed.find(range => match.start >= range.start && match.start < range.end)?.allowed ?? false);
	}

	/** For tests and the console: what a paragraph was classified as. */
	languageOfParagraph(paragraph: Element): TextLanguage | null {
		return this.languageOf(paragraph);
	}

	currentPageLanguage(): 'japanese' | 'chinese' | null {
		return this.pageLanguage;
	}

	/** What's been classified so far (with `track`), the paragraphs still on the page. */
	summary(): LanguageSummary {
		const paragraphs: Record<TextLanguage, number> = { japanese: 0, chinese: 0, mixed: 0, unclear: 0 };
		for (const [paragraph, language] of this.tracked) {
			if (!paragraph.isConnected) {
				this.tracked.delete(paragraph);
				continue;
			}
			if (language) paragraphs[language] += 1;
		}
		return {
			page: this.pageLanguage,
			declared: document.body ? languageOfAttribute(document.body) : null,
			tally: { ...this.tally },
			paragraphs,
			byChoice: [...this.provisional].filter(paragraph => paragraph.isConnected).length,
			chinese: this.options.chinese,
			unclear: this.options.unclear,
		};
	}

	/** Each classified paragraph still on the page, and its class (with `track`). */
	trackedParagraphs(): Array<[Element, TextLanguage | null]> {
		return [...this.tracked].filter(([paragraph]) => paragraph.isConnected);
	}

	private allows(language: TextLanguage | null, paragraph: Element | null): boolean {
		if (language === null || language === 'japanese' || language === 'mixed') return true;
		if (language === 'chinese') return this.options.chinese === 'highlight';
		// unclear: its context's language, else the choice for this site
		const context = (paragraph && languageOfAttribute(paragraph)) ?? this.pageLanguage;
		if (context) return this.allows(context, paragraph);
		if (paragraph) this.provisional.add(paragraph);
		return this.options.unclear === 'highlight';
	}

	private languageOf(paragraph: Element): TextLanguage | null {
		const known = this.paragraphs.get(paragraph);
		if (known) return known.language;
		const text = ownText(paragraph);
		const signals = countSignals(text, this.options.japaneseKanji);
		const entry = { language: classifyText(text, this.options.japaneseKanji, signals), weight: signals.kana + signals.han };
		this.paragraphs.set(paragraph, entry);
		this.count(entry, 1);
		if (this.options.track) this.tracked.set(paragraph, entry.language);
		return entry.language;
	}

	/** A paragraph's text counted toward (or taken off) its page's language. */
	private count(entry: ParagraphEntry, sign: 1 | -1): void {
		if (entry.language !== 'japanese' && entry.language !== 'chinese') return;
		this.tally[entry.language] += sign * entry.weight;
		const language = leadingLanguage(this.tally.japanese, this.tally.chinese);
		if (language === this.pageLanguage) return;
		this.pageLanguage = language;
		if (activeGate === this) window.setTimeout(notifyPageLanguage, 0);
		// the paragraphs decided without the page's language: again, with it (after this pass)
		if (language && this.provisional.size && this.options.onPageLanguage && this.notifyTimer === null) {
			this.notifyTimer = window.setTimeout(() => {
				this.notifyTimer = null;
				const paragraphs = [...this.provisional].filter(paragraph => paragraph.isConnected);
				this.provisional = new Set();
				this.options.onPageLanguage?.(paragraphs);
			}, 0);
		}
	}

	dispose(): void {
		if (this.notifyTimer !== null) clearTimeout(this.notifyTimer);
		this.notifyTimer = null;
		this.provisional.clear();
		this.tracked.clear();
		if (activeGate === this) {
			activeGate = null;
			window.setTimeout(notifyPageLanguage, 0);
		}
	}
}

/* ------------------------------------------------------------------ */
/* The rules, for the highlight and for what's read (pageStatsBar.ts)  */
/* ------------------------------------------------------------------ */

export type LanguageRules = {
	japaneseKanji: Set<string>;
	chinese: LanguageChoice;
	/** this site's choice (the sites listed go the other way) */
	unclear: LanguageChoice;
};

type KanjiData = { japanese?: string; learned?: string; notLearned?: string; byStage?: Record<string, string> } | null | undefined;

/**
 * The rules on this site (Settings → Highlight → Japanese or Chinese). Null when nothing is left
 * out (both highlighted, the default): then nothing needs classifying.
 */
export function languageRules(settings: any, kanji: KanjiData, unclearTextSites: string[] | null | undefined, host: string, always = false): LanguageRules | null {
	const chinese: LanguageChoice = settings?.highlighter?.chinese_text === 'skip' ? 'skip' : 'highlight';
	const byDefault: LanguageChoice = settings?.highlighter?.unclear_text === 'skip' ? 'skip' : 'highlight';
	const unclear: LanguageChoice = matchesSiteList(host, unclearTextSites)
		? (byDefault === 'skip' ? 'highlight' : 'skip')
		: byDefault;
	if (!always && !LanguageGate.needed(chinese, unclear)) return null;
	// the kanji Japanese uses: Jōyō and Jinmeiyō, and WaniKani's (a few are neither)
	const japaneseKanji = new Set<string>([
		...(kanji?.japanese ?? ''),
		...(kanji?.learned ?? ''),
		...(kanji?.notLearned ?? ''),
		...Object.values(kanji?.byStage ?? {}).join(''),
	]);
	return { japaneseKanji, chinese, unclear };
}

/** Whether text of this language is kept (highlighted, read), on a page of `page`'s language. */
function keeps(language: TextLanguage | null, rules: LanguageRules, page: 'japanese' | 'chinese' | null): boolean {
	if (language === null || language === 'japanese' || language === 'mixed') return true;
	if (language === 'chinese') return rules.chinese === 'highlight';
	if (page) return keeps(page, rules, null);
	return rules.unclear === 'highlight';
}

/**
 * A page's text (a line per paragraph) without what the rules leave out: its Chinese
 * paragraphs, its unclear ones (by the page's language, else the choice), a mixed one's
 * Chinese sentences. `declared`: the language the page says it's in (its lang).
 */
export function textByLanguage(
	text: string,
	rules: LanguageRules,
	declared: 'japanese' | 'chinese' | null,
): { text: string; page: 'japanese' | 'chinese' | null } {
	const lines = text.split('\n').map(line => {
		const signals = countSignals(line, rules.japaneseKanji);
		return { line, signals, language: classifyText(line, rules.japaneseKanji, signals) };
	});
	let japanese = 0;
	let chinese = 0;
	for (const { signals, language } of lines) {
		if (language === 'japanese') japanese += signals.kana + signals.han;
		if (language === 'chinese') chinese += signals.kana + signals.han;
	}
	const page = declared ?? leadingLanguage(japanese, chinese);
	const kept: string[] = [];
	for (const { line, language } of lines) {
		if (language !== 'mixed') {
			if (keeps(language, rules, page)) kept.push(line);
			continue;
		}
		// sentence by sentence (a Japanese quote in a Chinese paragraph)
		const sentences = sentenceRanges(line)
			.map(([start, end]) => line.slice(start, end))
			.filter(sentence => {
				const language = classifyText(sentence, rules.japaneseKanji);
				return keeps(language === 'mixed' ? 'japanese' : language, rules, page);
			});
		if (sentences.length) kept.push(sentences.join(''));
	}
	return { text: kept.join('\n'), page };
}

/** A sentence taken from a page is kept as the highlight would be (`page`: its page's language). */
export function sentenceKept(sentence: string, rules: LanguageRules, page: 'japanese' | 'chinese' | null): boolean {
	const language = classifyText(sentence, rules.japaneseKanji);
	return keeps(language === 'mixed' ? 'japanese' : language, rules, page);
}
