/**
 * The WaniKani words in a text, left to right: at each point the longest run of the segmenter's
 * tokens that's a word, as written or conjugated (話していました: 話す). Shared by the page's
 * highlighter, its reading level and the sentences kept, so they all see the same words.
 *
 * The segmenter sometimes joins words into one token (毎朝早く): a token that isn't (the start
 * of) a word is looked into, from each of its kanji. It also joins a conjugation's end with the
 * particle after it (行きませんか: 行き | ませ | んか): a conjugated word can end inside a token
 * when only particles follow in it.
 *
 * A word never splits a number: 二月 isn't in 十二月, nor 十分 (enough) in 三十分.
 */

export type WordFinder = {
	/** the word a run of text is (as written, or the one it's a conjugation of), else '' */
	lookup(run: string, couldConjugate: boolean): string;
	/** whether a conjugated word could start where this text starts (cheap; once per start) */
	couldConjugate(rest: string): boolean;
	/** how long a run to try from a start */
	limit(couldConjugate: boolean): number;
};

export type FoundWord = { start: number; end: number; word: string };

const KANJI = /[㐀-䶿一-鿿豈-﫿々]/;
const NUMERAL = /[〇一二三四五六七八九十百千万億]/;
/** what may follow a conjugation's end in the same token: particles only (んか, ますよ…) */
const PARTICLES = /^(?:か|ね|よ|な|わ|の|ぞ|さ|ぜ|が|も|は|を|に|で|と|へ|や|し|って|けど|から|ので|のに)+$/;

/** Whether text[start, end) starts or ends in the middle of a number written in kanji. */
function splitsNumber(text: string, start: number, end: number): boolean {
	return (start > 0 && NUMERAL.test(text[start - 1]) && NUMERAL.test(text[start]))
		|| (end < text.length && NUMERAL.test(text[end - 1]) && NUMERAL.test(text[end]));
}

export function scanWords(text: string, segmentTokens: string[], finder: WordFinder): FoundWord[] {
	const tokens = [...segmentTokens];
	const found: FoundWord[] = [];
	let position = 0;
	let i = 0;

	/** past `end`: the tokens it covers, and the start of the one it ends in */
	const consumeTo = (end: number) => {
		while (i < tokens.length && position + tokens[i].length <= end) {
			position += tokens[i].length;
			i += 1;
		}
		if (i < tokens.length && position < end) {
			tokens[i] = tokens[i].slice(end - position);
			position = end;
		}
	};

	while (i < tokens.length) {
		const could = finder.couldConjugate(text.slice(position));
		const limit = finder.limit(could);
		let best: FoundWord | null = null;
		let combined = '';
		for (let j = i; j < tokens.length; j++) {
			combined += tokens[j];
			if (combined.length > limit) break;
			const word = finder.lookup(combined, could);
			// each run is longer than the last: a word found now is the longest so far
			if (word && !splitsNumber(text, position, position + combined.length)) {
				best = { start: position, end: position + combined.length, word };
			}
		}
		if (could) {
			const longer = longerConjugation(text, position, tokens.slice(i), best ? best.end : position, limit, finder);
			if (longer) best = longer;
		}
		if (!best) best = insideToken(text, position, tokens[i], finder);
		if (best) {
			found.push(best);
			consumeTo(best.end);
		} else {
			position += tokens[i].length;
			i += 1;
		}
	}
	return found;
}

/**
 * A conjugated word from `start` ending past `after`, inside one of the `tokens` (from `start`)
 * that only has particles after it: the longest. The segmenter joins a conjugation's end with
 * them (行きませんか: 行き | ませ | んか finds 行く, not 行き). Only conjugations: a word as
 * written still ends where a token does.
 */
function longerConjugation(text: string, start: number, tokens: string[], after: number, limit: number, finder: WordFinder): FoundWord | null {
	let best: FoundWord | null = null;
	let tokenStart = start;
	for (const token of tokens) {
		const tokenEnd = tokenStart + token.length;
		if (tokenStart - start >= limit) break;
		for (let end = tokenStart + 1; end < tokenEnd; end++) {
			if (end <= after || end - start > limit || !PARTICLES.test(text.slice(end, tokenEnd))) continue;
			const run = text.slice(start, end);
			const word = finder.lookup(run, true);
			if (word && word !== run && !splitsNumber(text, start, end)) best = { start, end, word };
		}
		tokenStart = tokenEnd;
	}
	return best;
}

/** A word starting inside a token (from its first kanji that starts one), the longest there. */
function insideToken(text: string, position: number, token: string, finder: WordFinder): FoundWord | null {
	if (token.length < 2) return null;
	for (let offset = 0; offset < token.length; offset++) {
		if (!KANJI.test(token[offset])) continue;
		const start = position + offset;
		const could = finder.couldConjugate(text.slice(start));
		for (let length = Math.min(finder.limit(could), text.length - start); length >= 1; length--) {
			// the whole token from its start: already tried
			if (offset === 0 && length === token.length) continue;
			const word = finder.lookup(text.slice(start, start + length), could);
			if (word && !splitsNumber(text, start, start + length)) return { start, end: start + length, word };
		}
	}
	return null;
}
