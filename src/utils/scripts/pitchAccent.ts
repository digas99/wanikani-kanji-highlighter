/**
 * Pitch accent (Tokyo standard) for vocabulary, from Kanjium's data (CC BY-SA 4.0), shipped
 * as public/pitch/*.json by scripts/build-pitch-accents.mjs. Lookups cover all of Kanjium,
 * so vocabulary WaniKani adds later is found too.
 *
 * An accent is the mora after which the pitch drops (0: no drop, "heiban").
 */

const SHARD_COUNT = 256;

/** Which file a word is in. Same as shardKey() in scripts/build-pitch-accents.mjs. */
export function pitchShardKey(word: string): string {
	return ((word.codePointAt(0) ?? 0) % SHARD_COUNT).toString(16).padStart(2, '0');
}

export type PitchAccent = {
	/** mora after which the pitch drops; 0 = it doesn't (heiban) */
	drop: number;
	/** word class this accent is for, when the source tells them apart ("noun", "adverb"…) */
	partOfSpeech: string | null;
};

export type ReadingPitch = {
	reading: string;
	accents: PitchAccent[];
};

/** Kanjium's word class labels. */
const PART_OF_SPEECH: Record<string, string> = {
	名: 'noun',
	副: 'adverb',
	代: 'pronoun',
	形動: 'na-adjective',
	感: 'interjection',
};

function parseAccents(value: string): PitchAccent[] {
	return value.split(',').map(part => {
		const match = part.trim().match(/^(?:\(([^)]*)\))?(\d+)$/);
		if (!match) return null;
		const partOfSpeech = match[1]
			? match[1].split(';').map(label => PART_OF_SPEECH[label] ?? label).join(' / ')
			: null;
		return { drop: Number(match[2]), partOfSpeech };
	}).filter((accent): accent is PitchAccent => accent != null);
}

/** Katakana → hiragana (readings are compared in hiragana). */
export function toHiragana(text: string): string {
	return text.replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

/** Small kana belong to the mora before them (きょ, ファ); っ, ん and ー are morae of their own. */
const SMALL_KANA = /[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]/;

export function splitMorae(reading: string): string[] {
	const morae: string[] = [];
	for (const char of reading) {
		if (SMALL_KANA.test(char) && morae.length) morae[morae.length - 1] += char;
		else morae.push(char);
	}
	return morae;
}

export type PitchPattern = 'heiban' | 'atamadaka' | 'nakadaka' | 'odaka';

export function pitchPattern(drop: number, moraCount: number): PitchPattern {
	if (drop === 0) return 'heiban';
	if (drop === 1) return 'atamadaka';
	if (drop >= moraCount) return 'odaka';
	return 'nakadaka';
}

/**
 * High / low for each mora, plus a following particle (e.g. が): the particle is what tells
 * heiban (stays high) from odaka (drops).
 */
export function pitchLevels(drop: number, moraCount: number): { morae: boolean[]; particle: boolean } {
	const morae = Array.from({ length: moraCount }, (_, index) => {
		const position = index + 1;
		if (drop === 0) return position > 1;
		if (drop === 1) return position === 1;
		return position > 1 && position <= drop;
	});
	return { morae, particle: drop === 0 };
}

type Shard = Record<string, Array<[string, string]>>;

const shards = new Map<string, Promise<Shard | null>>();

/** Reads a data file of the extension (extension pages and the background only). */
function loadShard(key: string): Promise<Shard | null> {
	if (!shards.has(key)) {
		const url = browser.runtime.getURL(`/pitch/${key}.json` as any);
		shards.set(key, fetch(url).then(response => (response.ok ? response.json() : null)).catch(() => null));
	}
	return shards.get(key)!;
}

/**
 * Pitch accents of a word, for the given readings (WaniKani's; kana vocabulary: the word).
 * Readings Kanjium doesn't have are left out.
 */
export async function lookupPitchAccents(word: string, readings: string[]): Promise<ReadingPitch[]> {
	if (!word) return [];
	const entries = (await loadShard(pitchShardKey(word)))?.[word] ?? [];
	if (!entries.length) return [];
	const wanted = (readings.length ? readings : [word]).map(reading => ({ reading, key: toHiragana(reading) }));
	return wanted
		.map(({ reading, key }) => {
			const entry = entries.find(([entryReading]) => toHiragana(entryReading) === key);
			return entry ? { reading, accents: parseAccents(entry[1]) } : null;
		})
		.filter((result): result is ReadingPitch => Boolean(result?.accents.length));
}

/**
 * The same lookup from anywhere: web pages (the details popup's content script) can't read
 * the extension's files, so they ask the background script.
 */
export async function getPitchAccents(word: string, readings: string[]): Promise<ReadingPitch[]> {
	const onExtensionPage = location.protocol === 'chrome-extension:' || location.protocol === 'moz-extension:';
	if (onExtensionPage) return lookupPitchAccents(word, readings);
	try {
		const result = await browser.runtime.sendMessage({ type: 'wkh:getPitch', word, readings });
		return Array.isArray(result) ? result : [];
	} catch {
		return [];
	}
}
