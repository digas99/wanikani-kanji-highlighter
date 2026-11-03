import { findWords, type PageStatsTables, type Segmenter } from './pageStats';

/**
 * Example sentences from the pages read (Settings → Page reading level → Keep example
 * sentences): a few per page, kept with its history entry, shown on a subject's details.
 *
 * A sentence: the text of a block of the page's content (a paragraph, a list item, a quote…,
 * its furigana left out), split with the browser's Japanese sentence segmenter. Navigation,
 * headers, footers, menus, forms and what's hidden are left out; so are fragments, menus of
 * links and text that isn't mostly Japanese.
 *
 * Which ones: the most useful to study with. Each subject you're learning in a sentence is worth
 * points (Apprentice most, then Guru, Master…), once per page: the next sentence picked has to
 * bring others, so they cover as many as they can. Sentences with more than a couple of kanji
 * you haven't learned are left out (not readable yet), and a comfortable length is preferred.
 */

/** sentences kept per page (Settings → Reading → Sentences per page: `page_stats.sentences_per_page`) */
export const SENTENCES_PER_PAGE = 10;
export const SENTENCES_PER_PAGE_OPTIONS = [5, 10, 15, 20];

/** The sentences to keep per page, from the settings. */
export function sentencesPerPage(settings: any): number {
	const count = Number(settings?.page_stats?.sentences_per_page);
	return SENTENCES_PER_PAGE_OPTIONS.includes(count) ? count : SENTENCES_PER_PAGE;
}
/** stored sentences longer than this are cut (a safety net: the filter keeps them shorter) */
export const MAX_SENTENCE_LENGTH = 100;
/** sites whose sentences aren't kept (Settings, or a page's "Don't keep sentences from this site") */
export const SENTENCE_EXCLUDED_SITES_KEY = 'local:pageSentencesExcludedSites';

const MIN_LENGTH = 8;
const MAX_LENGTH = 80;
/** blocks read at most (very long pages: their start is enough to choose from) */
const MAX_BLOCKS = 1500;
const MAX_CANDIDATES = 400;
/** a sentence with more kanji you haven't learned than this isn't readable yet */
const MAX_UNKNOWN_KANJI = 2;
/** a subject already in a picked sentence: its worth in the next ones */
const COVERED_SHARE = 0.2;
/** below this, a sentence isn't worth keeping (only burned subjects, already covered…) */
const MIN_GAIN = 0.3;

const BLOCKS = 'p, li, dd, dt, blockquote, td, th, h1, h2, h3, h4, h5, h6, figcaption, caption';
const SKIP = [
	'nav', 'header', 'footer', 'aside', 'menu', 'button', 'form', 'select', 'textarea', 'input',
	'script', 'style', 'noscript', 'template', 'code', 'pre', 'rt', 'rp',
	// furigana that isn't <ruby> (Jisho's sentences: <span class="furigana">かぜ</span>風邪)
	'[class*="furigana"]',
	'[role="navigation"]', '[role="banner"]', '[role="contentinfo"]', '[role="menu"]', '[role="menubar"]',
	'[aria-hidden="true"]', '[contenteditable="true"]',
].join(', ');

const JAPANESE_CHAR = /[぀-ヿ㐀-䶿一-鿿豈-﫿ｦ-ﾟ々]/g;
const KANJI = /[㐀-䶿一-鿿豈-﫿々]/g;
const SEPARATORS = /[|｜/／・»›>＞]/g;

/* ------------------------------------------------------------------ */
/* Finding the sentences                                               */
/* ------------------------------------------------------------------ */

/** Reference marks ("[19]", "[注 3]", "[要出典]", "［2］"): not part of the sentence. */
const CITATIONS = /[[［](?:\d{1,4}|注\s*\d{1,3}|要出典|要検証|[a-z]|\d{1,4}\s*[-–,]\s*\d{1,4})[\]］]/g;

/**
 * An English phrase (two or more Latin words) stuck to the start or end of the Japanese, from
 * the site's interface around it ("You replied to No Mitsuやっぱり…"). One word alone stays (JR,
 * NHK, iPhone are part of sentences).
 */
const LATIN_WORD = "[A-Za-z][A-Za-z0-9'’.,:!?&-]*";
const JAPANESE_START = '[぀-ヿ㐀-䶿一-鿿豈-﫿「『（]';
const LEADING_PHRASE = new RegExp(`^(?:${LATIN_WORD}\\s+)+${LATIN_WORD}\\s*(?=${JAPANESE_START})`);
const TRAILING_PHRASE = new RegExp(`(?<=[。！？!?」』）぀-ヿ㐀-䶿一-鿿])\\s*(?:${LATIN_WORD}\\s+)+${LATIN_WORD}\\s*$`);

/**
 * A chat's / feed's English date or time stuck to the sentence ("Wed 11:02 PMポルトガルで…",
 * "…です。Yesterday at 9:15 AM"): weekdays, months, Yesterday / Today, "at", times with AM / PM.
 * A bare time ("11:02に起きた") is Japanese text: it stays.
 */
const STAMP_PART = [
	'(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\\.?,?',
	'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?(?:\\s+\\d{1,2}(?:st|nd|rd|th)?,?)?(?:\\s+\\d{4},?)?',
	'Yesterday,?', 'Today,?', 'at',
	'\\d{1,2}:\\d{2}(?::\\d{2})?\\s*[AaPp]\\.?[Mm]\\.?',
].join('|');
const LEADING_STAMP = new RegExp(`^(?:(?:${STAMP_PART})\\s*)+(?=${JAPANESE_START})`);
const TRAILING_STAMP = new RegExp(`(?<=[。！？!?」』）぀-ヿ㐀-䶿一-鿿])\\s*(?:(?:${STAMP_PART})\\s*)+$`);

export function cleanSentence(text: string): string {
	return text
		.replace(CITATIONS, '')
		.replace(LEADING_STAMP, '')
		.replace(TRAILING_STAMP, '')
		.replace(LEADING_PHRASE, '')
		.replace(TRAILING_PHRASE, '')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

function visible(element: Element): boolean {
	const check = (element as any).checkVisibility;
	if (typeof check === 'function') return check.call(element);
	return (element as HTMLElement).offsetParent !== null || getComputedStyle(element).position === 'fixed';
}

/**
 * A block's text, its furigana (and anything skipped) left out, and what isn't shown: hidden
 * labels and ids (Jisho's "jreibun/5251/1" before each sentence), screen-reader text. Parts on
 * lines of their own (a chat's "Wed 11:02 PM" over a message, a name, a button) are kept on
 * their own line: a sentence never runs across them.
 */
function blockText(block: Element): { text: string; linkText: number } {
	let text = '';
	let linkText = 0;
	const shown = new Map<Element, boolean>();
	const isShown = (element: Element) => {
		if (!shown.has(element)) shown.set(element, visible(element) && !isVisuallyHidden(element));
		return shown.get(element)!;
	};
	// the element a text's line is: its closest ancestor laid out as a line of its own
	const lines = new Map<Element, Element>();
	const lineOf = (element: Element): Element => {
		if (!lines.has(element)) {
			const line = element === block || isBlockLaidOut(element) || !element.parentElement
				? element
				: lineOf(element.parentElement);
			lines.set(element, line);
		}
		return lines.get(element)!;
	};
	const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
		acceptNode: node => {
			const parent = node.parentElement;
			if (!parent || parent.closest(SKIP) || !isShown(parent)) return NodeFilter.FILTER_REJECT;
			return NodeFilter.FILTER_ACCEPT;
		},
	});
	let line: Element | null = null;
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const value = node.nodeValue ?? '';
		const nodeLine = lineOf(node.parentElement!);
		if (line && nodeLine !== line) text += '\n';
		line = nodeLine;
		text += value;
		if (node.parentElement?.closest('a')) linkText += value.trim().length;
	}
	// spaces collapsed, the lines kept
	return { text: text.replace(/[^\S\n]+/g, ' ').replace(/ ?\n[\s]*/g, '\n').trim(), linkText };
}

/** Shown only to screen readers (clipped to nothing, or 1px): not part of what's read. */
function isVisuallyHidden(element: Element): boolean {
	const rect = element.getBoundingClientRect();
	if (rect.width <= 1 && rect.height <= 1) return true;
	const style = getComputedStyle(element);
	return style.visibility === 'hidden' || style.opacity === '0'
		|| (style.position === 'absolute' && (style.clip === 'rect(0px, 0px, 0px, 0px)' || style.clipPath === 'inset(50%)'));
}

let sentenceSegmenter: Intl.Segmenter | null | undefined;
function splitSentences(text: string): string[] {
	if (sentenceSegmenter === undefined) {
		sentenceSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
			? new Intl.Segmenter('ja', { granularity: 'sentence' })
			: null;
	}
	// a line (blockText's) ends a sentence: each split on its own
	return text.split('\n').flatMap(line => {
		const pieces = sentenceSegmenter
			? [...sentenceSegmenter.segment(line)].map(part => part.segment)
			// no segmenter: after 。！？ (and a closing quote)
			: line.split(/(?<=[。！？!?][」』）)]?)/);
		return joinOpenQuotes(pieces.map(piece => piece.trim()).filter(Boolean));
	});
}

const BRACKETS: Record<string, string> = { '「': '」', '『': '』', '（': '）', '(': ')', '【': '】' };

/** Brackets opened and not closed in a text, by kind. */
function openBrackets(text: string): number {
	let open = 0;
	for (const [opening, closing] of Object.entries(BRACKETS)) {
		open += Math.max(0, text.split(opening).length - text.split(closing).length);
	}
	return open;
}

/**
 * A quote holding a 。 is cut there by the segmenter (「…でした。｜…思います」と話した。): the
 * pieces are joined again while a bracket is still open. Not past a long run (a bracket never
 * closed shouldn't swallow the rest of the block).
 */
function joinOpenQuotes(pieces: string[]): string[] {
	const sentences: string[] = [];
	let current = '';
	for (const piece of pieces) {
		current += piece;
		if (openBrackets(current) === 0 || current.length > MAX_LENGTH * 2) {
			sentences.push(current);
			current = '';
		}
	}
	if (current) sentences.push(current);
	return sentences;
}

/** Readable Japanese: a sentence, not a fragment, a menu or a link list. */
function isSentence(text: string): boolean {
	if (text.length < MIN_LENGTH || text.length > MAX_LENGTH) return false;
	if (/https?:|www\.|@/.test(text)) return false;
	if (!/[㐀-䶿一-鿿豈-﫿]/.test(text)) return false;
	const compact = text.replace(/\s/g, '');
	const japanese = compact.match(JAPANESE_CHAR)?.length ?? 0;
	if (japanese / compact.length < 0.6) return false;
	// "ホーム｜ニュース｜…", breadcrumbs
	if ((text.match(SEPARATORS)?.length ?? 0) >= 3) return false;
	return true;
}

/**
 * Laid out as a block, a line of its own: not inline, not floated, not an item of a flex row
 * (a sentence's words as list items side by side, as on Jisho, aren't blocks however it's done).
 */
function isBlockLaidOut(element: Element): boolean {
	const style = getComputedStyle(element);
	if (style.display.startsWith('inline') || style.display === 'contents' || style.display === 'none') return false;
	if (style.float !== 'none') return false;
	const parent = element.parentElement;
	if (parent) {
		const parentStyle = getComputedStyle(parent);
		if (parentStyle.display.endsWith('flex') && !parentStyle.flexDirection.startsWith('column')) return false;
	}
	return true;
}

/**
 * The innermost blocks (a list item holding paragraphs is read through them), only those laid
 * out as blocks: a sentence whose words are inline list items is read whole, from its block.
 */
function innermostBlocks(root: Element): Element[] {
	const candidates = [...root.querySelectorAll(BLOCKS)].slice(0, MAX_BLOCKS * 2).filter(isBlockLaidOut);
	const set = new Set(candidates);
	const holding = new Set<Element>();
	for (const block of candidates) {
		for (let parent = block.parentElement; parent && parent !== root; parent = parent.parentElement) {
			if (holding.has(parent)) break;
			if (set.has(parent)) holding.add(parent);
		}
	}
	return candidates.filter(block => !holding.has(block));
}

const KANJI_TEXT = /[㐀-䶿一-鿿豈-﫿]/;
/** text nodes looked at for text outside the usual blocks, at most */
const MAX_LOOSE_TEXT_NODES = 6000;

/**
 * Japanese text that isn't in any of `found` (p, li, headings…): sites that write it in divs,
 * spans and their own elements (YouTube's comments and description, chats, social feeds). Each
 * piece is read from the block it's laid out in (its line), once.
 */
function looseTextBlocks(root: Element, found: Element[]): Element[] {
	const foundSet = new Set(found);
	const blockCache = new Map<Element, boolean>();
	const isBlock = (element: Element) => {
		let value = blockCache.get(element);
		if (value === undefined) {
			value = isBlockLaidOut(element);
			blockCache.set(element, value);
		}
		return value;
	};
	const blocks = new Set<Element>();
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let looked = 0;
	for (let node = walker.nextNode(); node && looked < MAX_LOOSE_TEXT_NODES; node = walker.nextNode()) {
		looked++;
		const parent = node.parentElement;
		if (!parent || !KANJI_TEXT.test(node.nodeValue ?? '')) continue;
		// already read with its block
		let covered = false;
		let block: Element | null = null;
		for (let element: Element | null = parent; element; element = element === root ? null : element.parentElement) {
			if (foundSet.has(element)) {
				covered = true;
				break;
			}
			// (not the root itself: the whole page; read whole only when nothing else is found)
			if (!block && element !== root && isBlock(element)) block = element;
		}
		if (covered || !block || blocks.has(block)) continue;
		blocks.add(block);
		if (blocks.size >= MAX_BLOCKS) break;
	}
	return [...blocks];
}

/** In the page's order. */
function byPosition(a: Element, b: Element): number {
	return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

/**
 * The page's sentences, in their order: in the given parts (the chosen ones), else the page's
 * article / main content, else the whole page.
 */
export function extractSentences(parts: Element[] = []): string[] {
	const roots = parts.length
		? parts
		: [...document.querySelectorAll('article, main, [role="main"]')].filter(visible);
	if (!roots.length && document.body) roots.push(document.body);

	const seen = new Set<string>();
	const sentences: string[] = [];
	let blocks = 0;
	for (const root of roots) {
		const found = innermostBlocks(root);
		// and the text outside those blocks (in divs, spans, a site's own elements)
		const loose = looseTextBlocks(root, found);
		const blocksHere = [...found, ...loose].sort(byPosition);
		for (const block of blocksHere.length ? blocksHere : [root]) {
			if (++blocks > MAX_BLOCKS || sentences.length >= MAX_CANDIDATES) break;
			if (block.closest(SKIP) || !visible(block)) continue;
			const { text, linkText } = blockText(block);
			// mostly links: a menu or a list of articles
			if (!text || linkText / text.length > 0.6) continue;
			for (const piece of splitSentences(text)) {
				const sentence = cleanSentence(piece);
				if (!isSentence(sentence) || seen.has(sentence)) continue;
				seen.add(sentence);
				sentences.push(sentence);
			}
		}
	}
	return sentences;
}

/* ------------------------------------------------------------------ */
/* Choosing the ones to keep                                           */
/* ------------------------------------------------------------------ */

/** What a subject at this stage is worth in a sentence: the ones being learned most. */
function stageWeight(stage: string | undefined): number {
	switch (stage) {
		case '1': case '2': case '3': case '4': return 3;
		case '5': case '6': return 2;
		case '7': case '8': return 1;
		case '9': return 0.3;
		default: return 0;
	}
}

type Candidate = { text: string; subjects: Map<string, number>; unknown: number; order: number };

function analyse(text: string, order: number, tables: PageStatsTables, segment?: Segmenter): Candidate {
	const subjects = new Map<string, number>();
	let unknown = 0;
	const stageOfKanji = (char: string) => tables.srs.find(([, chars]) => chars.has(char))?.[0];
	for (const char of new Set(text.match(KANJI) ?? [])) {
		if (char === '々') continue;
		if (!tables.learned.has(char)) unknown += 1;
		const weight = stageWeight(stageOfKanji(char));
		if (weight) subjects.set(`k:${char}`, weight);
	}
	// Words / Mixed: the WaniKani words in it count too (conjugated ones as their word: 話して → 話す)
	if (segment) {
		for (const { word } of findWords(text, tables, segment)) {
			const weight = stageWeight(tables.words.srs.get(word));
			if (weight) subjects.set(`w:${word}`, weight);
		}
	}
	return { text, subjects, unknown, order };
}

/** Comfortable to read: 15–50 characters best. */
function lengthFactor(length: number): number {
	if (length >= 15 && length <= 50) return 1;
	return length < 15 ? 0.6 : 0.75;
}

/**
 * The sentences to keep: picked one at a time, each the one bringing the most subjects not
 * covered yet (by their stage's worth), readable ones only. In the page's order.
 */
export function chooseSentences(
	sentences: string[],
	tables: PageStatsTables,
	{ limit = SENTENCES_PER_PAGE, segment }: { limit?: number; segment?: Segmenter } = {},
): string[] {
	const candidates = sentences
		.map((text, order) => analyse(text, order, tables, segment))
		.filter(candidate => candidate.unknown <= MAX_UNKNOWN_KANJI && candidate.subjects.size);
	const covered = new Set<string>();
	const picked: Candidate[] = [];
	while (picked.length < limit && candidates.length) {
		let best = -1;
		let bestGain = 0;
		candidates.forEach((candidate, index) => {
			let gain = 0;
			// new subjects first; ones already covered still count a little (another example of
			// a word you're learning is useful: a page all about one word fills its slots)
			for (const [key, weight] of candidate.subjects) gain += covered.has(key) ? weight * COVERED_SHARE : weight;
			// a new kanji or two is fine, but fewer is easier
			gain *= lengthFactor(candidate.text.length) * (1 - candidate.unknown * 0.15);
			if (gain > bestGain) {
				bestGain = gain;
				best = index;
			}
		});
		// nothing of use left (no subject you're learning in what's left)
		if (best < 0 || bestGain < MIN_GAIN) break;
		const [chosen] = candidates.splice(best, 1);
		for (const key of chosen.subjects.keys()) covered.add(key);
		picked.push(chosen);
	}
	return picked.sort((a, b) => a.order - b.order).map(candidate => candidate.text);
}
