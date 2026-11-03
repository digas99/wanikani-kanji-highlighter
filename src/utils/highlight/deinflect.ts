/**
 * Conjugated verbs and adjectives back to their dictionary form, so a conjugated word on a page
 * finds its WaniKani word: 話していました → 話す, 細くて → 細い, 来た → 来る, 勉強して → 勉強(する).
 *
 * Rule based (as dictionary popups do): the end of the text is replaced, step by step
 * (話していました → 話しています → 話している → 話して → 話す), each rule only for the kinds of
 * word that conjugate that way. A form found counts only if WaniKani has that word *as that
 * kind* (a godan verb, an い adjective…), from its parts of speech: 〜くて only reaches い
 * adjectives, 〜して only verbs ending in す.
 */

/** Kinds of word (bits). The last ones are in-between forms, met only while deinflecting. */
export const V1 = 1;      // ichidan verb (食べる)
export const V5 = 2;      // godan verb (話す)
export const VK = 4;      // 来る
export const VS = 8;      // する (and する verbs: 勉強する)
export const ADJ = 16;    // い adjective (細い)
const TE = 32;            // a て / で form (話して)
const MASU = 64;          // a polite ます form (話します)
/** a word as found in the text: any kind */
const ANY = 0xff;

/** Nouns that take する (勉強 → 勉強する); kept apart: they don't conjugate on their own. */
export const VS_NOUN = 256;

/** A word's kinds, from WaniKani's parts of speech (0: doesn't conjugate). */
export function inflectionOf(word: string, partsOfSpeech: string[] | undefined): number {
	const parts = (partsOfSpeech ?? []).map(part => part.toLowerCase());
	let kind = 0;
	if (parts.some(part => part.includes('godan'))) kind |= V5;
	if (parts.some(part => part.includes('ichidan'))) kind |= V1;
	if (parts.some(part => part.includes('い adjective') || part === 'i adjective' || part === 'adjective')) kind |= ADJ;
	if (parts.some(part => part.includes('する verb') || part.includes('suru verb'))) {
		kind |= word.endsWith('する') ? VS : VS_NOUN;
	}
	// 来る: WaniKani only says "intransitive verb"
	if (word.endsWith('来る') && !(kind & (V1 | V5))) kind |= VK;
	if (word.endsWith('する') && parts.some(part => part.includes('verb'))) kind |= VS;
	return kind;
}

type Rule = [from: string, to: string, typeIn: number, typeOut: number];

const GODAN_ROWS: Array<[u: string, a: string, i: string, e: string, o: string]> = [
	['う', 'わ', 'い', 'え', 'お'],
	['く', 'か', 'き', 'け', 'こ'],
	['ぐ', 'が', 'ぎ', 'げ', 'ご'],
	['す', 'さ', 'し', 'せ', 'そ'],
	['つ', 'た', 'ち', 'て', 'と'],
	['ぬ', 'な', 'に', 'ね', 'の'],
	['ぶ', 'ば', 'び', 'べ', 'ぼ'],
	['む', 'ま', 'み', 'め', 'も'],
	['る', 'ら', 'り', 'れ', 'ろ'],
];

function buildRules(): Rule[] {
	const rules: Rule[] = [];
	const add = (from: string, to: string, typeIn: number, typeOut: number) => rules.push([from, to, typeIn, typeOut]);

	// polite: ました / ません / ませんでした / ましょう / まして → ます
	for (const ending of ['ました', 'ません', 'ませんでした', 'ましょう', 'まして']) add(ending, 'ます', ANY, MASU);
	// たい (want to), ながら (while), なさい: on the ます stem
	add('たい', 'ます', ANY, MASU);
	add('ながら', 'ます', ANY, MASU);
	add('なさい', 'ます', ANY, MASU);
	// ます → dictionary form
	add('ます', 'る', MASU | ANY, V1);
	add('します', 'する', MASU | ANY, VS);
	add('来ます', '来る', MASU | ANY, VK);
	for (const [u, , i] of GODAN_ROWS) add(`${i}ます`, u, MASU | ANY, V5);

	// ている / てる / でいる / でる / てしまう / てください → the て form
	add('ている', 'て', V1, TE);
	add('てる', 'て', V1, TE);
	add('でいる', 'で', V1, TE);
	add('でる', 'で', V1, TE);
	add('てしまう', 'て', V5, TE);
	add('でしまう', 'で', V5, TE);
	add('てください', 'て', ANY, TE);
	add('でください', 'で', ANY, TE);
	add('ておく', 'て', V5, TE);

	// たら / だら (if… / when…) → the past form
	add('たら', 'た', ANY, ANY);
	add('だら', 'だ', ANY, ANY);
	// て / た forms → dictionary form
	const teTa = (suffixTe: string, suffixTa: string, to: string, type: number) => {
		add(suffixTe, to, TE | ANY, type);
		add(suffixTa, to, ANY, type);
	};
	teTa('て', 'た', 'る', V1);
	teTa('して', 'した', 'す', V5);
	teTa('して', 'した', 'する', VS);
	teTa('来て', '来た', '来る', VK);
	teTa('いて', 'いた', 'く', V5);
	teTa('いで', 'いだ', 'ぐ', V5);
	for (const to of ['う', 'つ', 'る']) teTa('って', 'った', to, V5);
	// 行く: 行って / 行った
	teTa('行って', '行った', '行く', V5);
	for (const to of ['ぬ', 'ぶ', 'む']) teTa('んで', 'んだ', to, V5);

	// negative: ない (itself an い adjective: なかった, なくて… come back here first)
	add('ない', 'る', ANY, V1);
	add('しない', 'する', ANY, VS);
	add('来ない', '来る', ANY, VK);
	for (const [u, a] of GODAN_ROWS) add(`${a}ない`, u, ANY, V5);

	// い adjectives: 細くて, 細かった, 細く, 細くない, 細ければ
	add('くて', 'い', ANY, ADJ);
	add('かった', 'い', ANY, ADJ);
	add('く', 'い', ANY, ADJ);
	add('ければ', 'い', ANY, ADJ);

	// passive / potential / causative: themselves ichidan verbs (書かれます → 書かれる → 書く)
	add('られる', 'る', V1, V1);
	add('させる', 'る', V1, V1);
	add('させる', 'する', V1, VS);
	add('される', 'する', V1, VS);
	add('できる', 'する', V1, VS);
	for (const [u, a, , e] of GODAN_ROWS) {
		add(`${a}れる`, u, V1, V5);
		add(`${a}せる`, u, V1, V5);
		add(`${e}る`, u, V1, V5);
	}

	// volitional: 食べよう, 話そう, しよう
	add('よう', 'る', ANY, V1);
	add('しよう', 'する', ANY, VS);
	add('来よう', '来る', ANY, VK);
	for (const [u, , , , o] of GODAN_ROWS) add(`${o}う`, u, ANY, V5);

	// conditional: 食べれば, 話せば, すれば
	add('れば', 'る', ANY, V1);
	add('すれば', 'する', ANY, VS);
	add('来れば', '来る', ANY, VK);
	for (const [u, , , e] of GODAN_ROWS) add(`${e}ば`, u, ANY, V5);

	return rules;
}

const RULES = buildRules();
/** rules by their ending's last character (most endings are tried against few rules) */
const RULES_BY_LAST = new Map<string, Rule[]>();
for (const rule of RULES) {
	const last = rule[0].slice(-1);
	if (!RULES_BY_LAST.has(last)) RULES_BY_LAST.set(last, []);
	RULES_BY_LAST.get(last)!.push(rule);
}

export type Deinflected = { word: string; type: number; steps: number };

/** Every dictionary form a text could be (itself first), with the kinds it'd have and how far it is. */
export function deinflect(text: string, maxSteps = 6): Deinflected[] {
	const results: Deinflected[] = [{ word: text, type: ANY, steps: 0 }];
	const seen = new Map<string, number>([[text, ANY]]);
	for (let index = 0; index < results.length; index++) {
		const { word, type, steps } = results[index];
		if (steps >= maxSteps) continue;
		for (const [from, to, typeIn, typeOut] of RULES_BY_LAST.get(word.slice(-1)) ?? []) {
			if (!(type & typeIn) || !word.endsWith(from) || word.length <= from.length - to.length) continue;
			const next = word.slice(0, -from.length) + to;
			if (!next || next.length > word.length + 2) continue;
			const known = seen.get(next) ?? 0;
			if ((known & typeOut) === typeOut) continue;
			seen.set(next, known | typeOut);
			results.push({ word: next, type: typeOut, steps: steps + 1 });
		}
	}
	return results;
}

/**
 * Finds the WaniKani word a (possibly conjugated) text is. `inflections`: word → its kinds (only
 * the words that conjugate); `has`: whether a word is one to highlight.
 */
export class ConjugationMatcher {
	private readonly inflections: Map<string, number>;
	private readonly has: (word: string) => boolean;
	/** the start of every conjugating word (話す → 話, 食べる → 食べ): a text not starting with one is skipped */
	private readonly stems = new Set<string>();
	private longestStem = 0;

	constructor(inflections: Record<string, number> | Map<string, number> | undefined, has: (word: string) => boolean) {
		this.inflections = inflections instanceof Map ? inflections : new Map(Object.entries(inflections ?? {}));
		this.has = has;
		for (const [word, kind] of this.inflections) {
			// a する noun's stem is itself (勉強して); the others drop their last kana (る, す, い…)
			const stem = kind & VS_NOUN ? word : word.endsWith('する') ? word.slice(0, -2) : word.slice(0, -1);
			if (!stem) continue;
			this.stems.add(stem);
			if (stem.length > this.longestStem) this.longestStem = stem.length;
		}
	}

	get active(): boolean {
		return this.stems.size > 0;
	}

	/** Whether a text could start a conjugated word (cheap: before trying to deinflect it). */
	couldStart(text: string): boolean {
		for (let length = Math.min(this.longestStem, text.length); length >= 1; length--) {
			if (this.stems.has(text.slice(0, length))) return true;
		}
		return false;
	}

	/** The word a conjugated text is (not the text itself as written), and how many steps away. */
	match(text: string): { word: string; steps: number } | null {
		let best: { word: string; steps: number } | null = null;
		for (const { word, type, steps } of deinflect(text)) {
			if (steps === 0) continue;
			let found: string | null = null;
			const kind = this.inflections.get(word) ?? 0;
			if (kind & type && this.has(word)) found = word;
			// 勉強する: the noun 勉強, which takes する
			else if (type & VS && word.endsWith('する')) {
				const noun = word.slice(0, -2);
				if (((this.inflections.get(noun) ?? 0) & VS_NOUN) && this.has(noun)) found = noun;
			}
			if (found && (!best || steps < best.steps)) best = { word: found, steps };
		}
		return best;
	}
}
