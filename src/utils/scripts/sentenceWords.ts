import { storage } from '#imports';
import TinySegmenter from 'tiny-segmenter';
import type { HighlightData } from '@/utils/highlight/highlightConfig';
import { buildPageStatsTables, findWords, type PageStatsTables } from './pageStats';

/**
 * The WaniKani words in a kept sentence, as the page's highlighter finds them (conjugated ones as
 * their word: 話していました → 話す, not 話). Which sentences are a word's: those with the word in
 * them, not just its characters.
 */

let tables: Promise<PageStatsTables | null> | null = null;
let segmenter: TinySegmenter | null = null;
let watching = false;
const cache = new Map<string, Set<string>>();

function loadTables(): Promise<PageStatsTables | null> {
	if (!watching) {
		watching = true;
		// a newer highlight data (another sync): read again next time
		storage.watch('local:highlightData', () => {
			tables = null;
			cache.clear();
		});
	}
	if (!tables) {
		tables = storage.getItem<HighlightData>('local:highlightData')
			.then(data => (data ? buildPageStatsTables(data) : null))
			.catch(() => null);
	}
	return tables;
}

export type SentenceReader = {
	/** the WaniKani words in it */
	words(sentence: string): Set<string>;
	/** how many of its kanji you haven't learned (fewer: easier to read) */
	unknownKanji(sentence: string): number;
	/** the WaniKani subjects in it: kanji as "k:日", words as "w:日本" */
	subjects(sentence: string): string[];
	/** a subject's SRS stage ("k:日" / "w:日本" → '0'…'9', 'locked'; undefined: not found) */
	stageOf(subject: string): string | undefined;
};

const KANJI = /[㐀-䶿一-鿿豈-﫿]/g;

/** A reader of sentences (null: no highlight data yet, the caller falls back). */
export async function sentenceWordReader(): Promise<SentenceReader | null> {
	const loaded = await loadTables();
	if (!loaded) return null;
	if (!segmenter) segmenter = new TinySegmenter();
	const segment = (text: string) => segmenter!.segment(text);
	const reader: SentenceReader = {
		words(sentence) {
			let words = cache.get(sentence);
			if (!words) {
				words = new Set(findWords(sentence, loaded, segment).map(found => found.word));
				cache.set(sentence, words);
			}
			return words;
		},
		unknownKanji(sentence) {
			return new Set((sentence.match(KANJI) ?? []).filter(char => !loaded.learned.has(char))).size;
		},
		subjects(sentence) {
			const kanji = new Set((sentence.match(KANJI) ?? []).filter(char => loaded.learned.has(char) || loaded.notLearned.has(char)));
			return [...[...kanji].map(char => `k:${char}`), ...[...reader.words(sentence)].map(word => `w:${word}`)];
		},
		stageOf(subject) {
			const value = subject.slice(2);
			if (subject.startsWith('w:')) return loaded.words.srs.get(value);
			return loaded.srs.find(([, chars]) => chars.has(value))?.[0];
		},
	};
	return reader;
}
