/**
 * The WaniKani words in a text, left to right: at each point the longest run of the segmenter's
 * tokens that's a word, as written or conjugated (話していました: 話す). Shared by the page's
 * highlighter, its reading level and the sentences kept, so they all see the same words.
 *
 * The segmenter sometimes joins words into one token (毎朝早く): a token that isn't (the start
 * of) a word is looked into, from each of its kanji.
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
			if (word) best = { start: position, end: position + combined.length, word };
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
			if (word) return { start, end: start + length, word };
		}
	}
	return null;
}
