import { SRS_STAGE_SECTIONS, getSrsStageColor, type SrsStageKey } from '@/utils/highlight/srsStageHighlight';
import { JLPT_GRADE_SECTIONS, JOYO_GRADE_SECTIONS } from '@/utils/highlight/schoolGradeHighlight';
import type { HighlightData } from '@/utils/highlight/highlightConfig';
import { ConjugationMatcher } from '@/utils/highlight/deinflect';
import { scanWords, type FoundWord } from '@/utils/highlight/wordScan';

/**
 * How much of a page you know, split by learned / SRS stage / JLPT level / Jōyō grade, with a
 * Todaii-like JLPT level for the page and a reading comfort rating. Shown on the page
 * (PageStatsBar) and kept in the history.
 *
 * What's counted follows the highlight: its kanji (Kanji mode), or its WaniKani words plus the
 * kanji outside them (Words / Mixed: every kanji is counted once, in a word or on its own).
 * Each different kanji / word counts once.
 */

export type PageStatsView = 'learned' | 'srs' | 'jlpt' | 'joyo';

export type PageStatsUnit = 'kanji' | 'words';

export type PageStats = {
	/** different kanji / words counted */
	total: number;
	/** the kanji counted, by group (the characters, for the history's list) */
	learned: string;
	notLearned: string;
	/** kanji WaniKani doesn't teach */
	other: string;
	/** what was counted (missing: kanji, as before words could be) */
	unit?: PageStatsUnit;
	/** Words / Mixed: the WaniKani words counted, by group */
	learnedWords?: string[];
	notLearnedWords?: string[];
	srs: Partial<Record<SrsStageKey, number>>;
	jlpt: Record<string, number>;
	joyo: Record<string, number>;
	/** 0–100 */
	learnedPercent: number;
	/** the lowest JLPT level covering most of the page's kanji: 'N5' … 'N1', or 'N1+' */
	level: string;
	/** only the chosen parts of the page were rated (not the whole page) */
	partial?: boolean;
};

/** Sites where the bar was hidden ("Hide on this site"; Settings shows them again). */
export const HIDDEN_SITES_KEY = 'local:pageStatsHiddenSites';
/** Per site, the parts of its pages to rate (CSS selectors; "Choose parts" on the bar). */
export const SECTIONS_KEY = 'local:pageStatsSections';
/** Sites where focus was left on (Settings → Focus remembers → The whole site). */
export const FOCUS_SITES_KEY = 'local:pageStatsFocusSites';

/** Below this many different kanji / words, there isn't enough Japanese to rate. */
export const MIN_PAGE_KANJI = 10;
/** Share of the page's kanji a JLPT level (and the ones below it) must cover to be the page's level. */
const LEVEL_COVERAGE = 0.9;
/** Pages longer than this are read up to here (enough to rate them). */
const MAX_TEXT_LENGTH = 300_000;
/** Splitting into words is slower: a shorter part of very long pages. */
const MAX_WORDS_TEXT_LENGTH = 100_000;

const JAPANESE = /[぀-ヿ㐀-䶿一-鿿豈-﫿ｦ-ﾟ]/;

const KANJI = /[㐀-䶿一-鿿豈-﫿々]/g;

function lookup(chars: string | undefined): Set<string> {
	return new Set(chars ?? '');
}

/** word → its group, from a highlight data's `{ group: words[] }` */
function wordLookup<K extends string>(groups: Partial<Record<K, string[]>> | undefined): Map<string, K> {
	const map = new Map<string, K>();
	for (const [key, words] of Object.entries(groups ?? {}) as Array<[K, string[]]>) {
		for (const word of words ?? []) map.set(word, key);
	}
	return map;
}

/** The tables, built once per highlight data. */
export type PageStatsTables = {
	learned: Set<string>;
	notLearned: Set<string>;
	/** the kanji Japanese uses (Jōyō + Jinmeiyō): others outside WaniKani aren't counted. Empty: all are. */
	japanese: Set<string>;
	srs: Array<[SrsStageKey, Set<string>]>;
	jlpt: Array<[string, Set<string>]>;
	joyo: Array<[string, Set<string>]>;
	words: {
		learned: Set<string>;
		notLearned: Set<string>;
		srs: Map<string, SrsStageKey>;
		jlpt: Map<string, string>;
		joyo: Map<string, string>;
		longest: number;
		/** conjugated verbs / adjectives → their word (話して → 話す) */
		conjugations: ConjugationMatcher;
	};
};

/** how much longer than its word a conjugated form may be (as the highlighter) */
const MAX_CONJUGATION = 10;

/** The WaniKani words of a text (as the page's highlighter finds them: wordScan.ts). */
export function findWords(text: string, tables: PageStatsTables, segment: Segmenter): FoundWord[] {
	const { words } = tables;
	return scanWords(text, segment(text), {
		lookup: (run, couldConjugate) => (words.learned.has(run) || words.notLearned.has(run)
			? run
			: couldConjugate ? words.conjugations.match(run)?.word ?? '' : ''),
		couldConjugate: rest => words.conjugations.active && words.conjugations.couldStart(rest),
		limit: couldConjugate => words.longest + (couldConjugate ? MAX_CONJUGATION : 0),
	});
}

export function buildPageStatsTables(data: HighlightData): PageStatsTables {
	const learnedWords = new Set(data.vocabulary?.learned ?? []);
	const notLearnedWords = new Set(data.vocabulary?.notLearned ?? []);
	let longest = 0;
	for (const word of [...learnedWords, ...notLearnedWords]) longest = Math.max(longest, word.length);
	return {
		learned: lookup(data.kanji?.learned),
		notLearned: lookup(data.kanji?.notLearned),
		japanese: lookup(data.kanji?.japanese),
		srs: SRS_STAGE_SECTIONS.map(section => [section.key, lookup(data.kanji?.byStage?.[section.key])]),
		jlpt: JLPT_GRADE_SECTIONS.map(section => [section.key, lookup(data.kanji?.byJlpt?.[section.key as keyof typeof data.kanji.byJlpt])]),
		joyo: JOYO_GRADE_SECTIONS.map(section => [section.key, lookup(data.kanji?.byJoyo?.[section.key as keyof typeof data.kanji.byJoyo])]),
		words: {
			learned: learnedWords,
			notLearned: notLearnedWords,
			srs: wordLookup(data.vocabulary?.byStage),
			jlpt: wordLookup(data.vocabulary?.byJlpt),
			joyo: wordLookup(data.vocabulary?.byJoyo),
			longest,
			conjugations: new ConjugationMatcher(
				data.vocabulary?.inflections,
				word => learnedWords.has(word) || notLearnedWords.has(word),
			),
		},
	};
}

/** The text split into words (the page's highlighter's segmenter; only the page has it). */
export type Segmenter = (text: string) => string[];

/**
 * The WaniKani words in a text (longest match over the segmenter's tokens, like the page's
 * highlighter), and the kanji that aren't in one of them.
 */
function wordsAndLeftoverKanji(text: string, tables: PageStatsTables, segment: Segmenter): { words: Set<string>; kanji: Set<string> } {
	const words = new Set<string>();
	const kanji = new Set<string>();
	for (const line of text.split(/\n+/)) {
		if (!JAPANESE.test(line)) continue;
		// the words (conjugated ones as their word: 話していました → 話す), the kanji between them
		let last = 0;
		for (const { start, end, word } of findWords(line, tables, segment)) {
			for (const char of line.slice(last, start).match(KANJI) ?? []) kanji.add(char);
			words.add(word);
			last = end;
		}
		for (const char of line.slice(last).match(KANJI) ?? []) kanji.add(char);
	}
	return { words, kanji };
}

/**
 * The page's stats. With `segment` (Words / Mixed), its WaniKani words and the kanji outside
 * them; without, its kanji.
 */
export function computePageStats(text: string, tables: PageStatsTables, segment?: Segmenter): PageStats {
	let words = new Set<string>();
	let kanji: Set<string>;
	if (segment) {
		({ words, kanji } = wordsAndLeftoverKanji(text.length > MAX_WORDS_TEXT_LENGTH ? text.slice(0, MAX_WORDS_TEXT_LENGTH) : text, tables, segment));
	} else {
		kanji = new Set((text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text).match(KANJI) ?? []);
	}
	kanji.delete('々');
	// characters Japanese doesn't use (simplified Chinese, rare hanzi) aren't the page's Japanese
	if (tables.japanese.size) {
		for (const char of kanji) {
			if (!tables.japanese.has(char) && !tables.learned.has(char) && !tables.notLearned.has(char)) kanji.delete(char);
		}
	}
	let learned = '';
	let notLearned = '';
	let other = '';
	const learnedWords: string[] = [];
	const notLearnedWords: string[] = [];
	const srs: Partial<Record<SrsStageKey, number>> = {};
	const jlpt: Record<string, number> = {};
	const joyo: Record<string, number> = {};
	const add = (into: Record<string, number>, key: string | undefined) => {
		into[key ?? 'none'] = (into[key ?? 'none'] ?? 0) + 1;
	};

	for (const char of kanji) {
		if (tables.learned.has(char)) learned += char;
		else if (tables.notLearned.has(char)) notLearned += char;
		else other += char;
		const stage = tables.srs.find(([, chars]) => chars.has(char));
		if (stage) srs[stage[0]] = (srs[stage[0]] ?? 0) + 1;
		add(jlpt, tables.jlpt.find(([, chars]) => chars.has(char))?.[0]);
		add(joyo, tables.joyo.find(([, chars]) => chars.has(char))?.[0]);
	}
	for (const word of words) {
		(tables.words.learned.has(word) ? learnedWords : notLearnedWords).push(word);
		const stage = tables.words.srs.get(word) ?? 'locked';
		srs[stage] = (srs[stage] ?? 0) + 1;
		add(jlpt, tables.words.jlpt.get(word));
		add(joyo, tables.words.joyo.get(word));
	}

	const total = kanji.size + words.size;
	return {
		total,
		learned,
		notLearned,
		other,
		...(segment ? { unit: 'words' as const, learnedWords, notLearnedWords } : {}),
		srs,
		jlpt,
		joyo,
		learnedPercent: total ? ((learned.length + learnedWords.length) / total) * 100 : 0,
		level: jlptLevel(jlpt, total),
	};
}

/** Learned / not learned / not on WaniKani, words and kanji together. */
export function unitCounts(stats: Pick<PageStats, 'learned' | 'notLearned' | 'other' | 'learnedWords' | 'notLearnedWords'>) {
	const words = (stats.learnedWords?.length ?? 0) + (stats.notLearnedWords?.length ?? 0);
	return {
		learned: stats.learned.length + (stats.learnedWords?.length ?? 0),
		notLearned: stats.notLearned.length + (stats.notLearnedWords?.length ?? 0),
		other: stats.other.length,
		words,
		kanji: stats.learned.length + stats.notLearned.length + stats.other.length,
	};
}

/** "68 different kanji", or "43 words · 12 kanji" (Words / Mixed). */
export function unitsText(stats: PageStats): string {
	const counts = unitCounts(stats);
	if (stats.unit !== 'words') return `${counts.kanji} different kanji`;
	return `${counts.words} ${counts.words === 1 ? 'word' : 'words'} · ${counts.kanji} kanji`;
}

/** "kanji", or "words and kanji": what the classification is of */
export function unitsNoun(stats: Pick<PageStats, 'unit'>): string {
	return stats.unit === 'words' ? 'words and kanji' : 'kanji';
}

/** From N5 up: the first level whose kanji (with the easier ones) cover most of the page. */
function jlptLevel(jlpt: Record<string, number>, total: number): string {
	if (!total) return '–';
	let covered = 0;
	for (const section of JLPT_GRADE_SECTIONS) {
		covered += jlpt[section.key] ?? 0;
		if (covered / total >= LEVEL_COVERAGE) return section.label;
	}
	return 'N1+';
}

/**
 * How comfortable the page should be to read, from the share of its kanji you know
 * (learned, or weighted by SRS stage: the same scale). `color` for text, `badge` behind white text.
 */
export function readingRating(percent: number): { label: string; color: string; badge: string } {
	if (percent >= 95) return { label: 'Easy', color: '#30a46c', badge: '#2f8f5b' };
	if (percent >= 85) return { label: 'Comfortable', color: '#7cb342', badge: '#5f9435' };
	if (percent >= 70) return { label: 'Challenging', color: '#fbc02d', badge: '#c48d0f' };
	return { label: 'Hard', color: '#e5484d', badge: '#d33a3a' };
}

/** How much a kanji at each SRS stage counts as known, for the SRS rating. */
const SRS_WEIGHTS: Partial<Record<SrsStageKey, number>> = {
	'9': 1,
	'8': 0.9,
	'7': 0.8,
	'6': 0.65,
	'5': 0.65,
	'4': 0.3,
	'3': 0.3,
	'2': 0.3,
	'1': 0.3,
};

/** The page's kanji you know, weighted by how well (SRS stage): 0–100. */
export function srsWeightedPercent(stats: Pick<PageStats, 'srs' | 'total'>): number {
	if (!stats.total) return 0;
	const known = Object.entries(stats.srs).reduce((sum, [stage, count]) => sum + (SRS_WEIGHTS[stage as SrsStageKey] ?? 0) * (count ?? 0), 0);
	return (known / stats.total) * 100;
}

const JOYO_LEVELS: Array<[string, string]> = [
	['g1', 'G1'], ['g2', 'G2'], ['g3', 'G3'], ['g4', 'G4'], ['g5', 'G5'], ['g6', 'G6'], ['g9', '中'],
];

export const JOYO_LEVEL_COLORS: Record<string, string> = {
	G1: '#2f8f5b',
	G2: '#4f9a3a',
	G3: '#7a9e2a',
	G4: '#c48d0f',
	G5: '#d17a26',
	G6: '#d3602f',
	中: '#c94040',
	'中+': '#8a2d2d',
};

/** Like the JLPT level: the school grade by which most of the page's kanji are taught. */
export function joyoLevel(joyo: Record<string, number>, total: number): string {
	if (!total) return '–';
	let covered = 0;
	for (const [key, label] of JOYO_LEVELS) {
		covered += joyo[key] ?? 0;
		if (covered / total >= LEVEL_COVERAGE) return label;
	}
	return '中+';
}

export type PageBadge = {
	/** the badge's text: a level (N3, G4) or a rating (Comfortable) */
	text: string;
	color: string;
	/** the % next to it (learned, or weighted by SRS) */
	percent: number;
	/** the rating that % gives */
	rating: ReturnType<typeof readingRating>;
	title: string;
};

/**
 * The page's classification for a view: JLPT / Jōyō rate the page itself (its level), Learned
 * and SRS rate how well you'd read it (SRS being the strict one).
 */
export function pageBadge(stats: PageStats, view: PageStatsView): PageBadge {
	const learned = Math.round(stats.learnedPercent);
	const noun = unitsNoun(stats);
	if (view === 'srs') {
		const weighted = Math.round(srsWeightedPercent(stats));
		const rating = readingRating(weighted);
		return {
			text: rating.label,
			color: rating.badge,
			percent: weighted,
			rating,
			title: `Reading ease by SRS: ${weighted}% (${noun} count by how well you know them: Burned fully, Guru about two thirds, Apprentice a third)`,
		};
	}
	const rating = readingRating(stats.learnedPercent);
	if (view === 'learned') {
		return { text: rating.label, color: rating.badge, percent: learned, rating, title: `Reading ease: ${learned}% of the ${noun} learned` };
	}
	if (view === 'joyo') {
		const level = joyoLevel(stats.joyo, stats.total);
		return {
			text: level,
			color: JOYO_LEVEL_COLORS[level] ?? '#5c5f73',
			percent: learned,
			rating,
			title: level === '中+' ? 'Beyond the Jōyō kanji' : `Jōyō: 90% of the ${noun} are taught by ${level === '中' ? 'secondary school' : `grade ${level.slice(1)}`}`,
		};
	}
	return {
		text: stats.level,
		color: LEVEL_COLORS[stats.level] ?? '#5c5f73',
		percent: learned,
		rating,
		title: `JLPT: 90% of the ${noun} are ${stats.level === 'N1+' ? 'beyond N1' : `${stats.level} or easier`}`,
	};
}

export const LEVEL_COLORS: Record<string, string> = {
	N5: '#2f6f4f',
	N4: '#3d6fd6',
	N3: '#6e4fc4',
	N2: '#e0b020',
	N1: '#d33a3a',
	'N1+': '#8a2d2d',
};

export type BarSegment = { key: string; label: string; count: number; color: string };

/** The segments of one view's bar, in order (empty ones left out). */
export function barSegments(
	stats: Pick<PageStats, 'learned' | 'notLearned' | 'other' | 'learnedWords' | 'notLearnedWords' | 'srs' | 'jlpt' | 'joyo'>,
	view: PageStatsView,
	appearance: Record<string, string> = {},
): BarSegment[] {
	const outside = { label: 'Not on WaniKani', color: '#5c5f73' };
	const counts = unitCounts(stats);
	let segments: BarSegment[];
	if (view === 'learned') {
		segments = [
			{ key: 'learned', label: 'Learned', count: counts.learned, color: appearance.highlight_learned || '#00aaff' },
			{ key: 'notLearned', label: 'Not learned', count: counts.notLearned, color: appearance.highlight_not_learned || '#f100a1' },
			{ key: 'other', ...outside, count: counts.other },
		];
	} else if (view === 'srs') {
		// burned first: the most known on the left, like the others
		segments = [...SRS_STAGE_SECTIONS].reverse().map(section => ({
			key: section.key,
			label: section.label,
			count: stats.srs[section.key] ?? 0,
			color: getSrsStageColor(section.key, appearance),
		}));
		segments.push({ key: 'other', ...outside, count: counts.other });
	} else {
		const sections = view === 'jlpt' ? JLPT_GRADE_SECTIONS : JOYO_GRADE_SECTIONS;
		const counts = view === 'jlpt' ? stats.jlpt : stats.joyo;
		segments = sections.map(section => ({
			key: section.key,
			label: view === 'joyo' && section.key === 'g9' ? 'Secondary' : section.label,
			count: counts[section.key] ?? 0,
			color: view === 'jlpt' ? LEVEL_COLORS[section.label] : section.fallbackColor,
		}));
		segments.push({ key: 'none', label: view === 'jlpt' ? 'Not in the JLPT' : 'Not Jōyō', count: counts.none ?? 0, color: '#5c5f73' });
	}
	return segments.filter(segment => segment.count > 0);
}

const JLPT_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1', 'N1+'];
const JOYO_ORDER = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', '中', '中+'];

/**
 * How hard the page is in a view (higher: harder), to sort by: its level (JLPT / Jōyō), or how
 * much of it you don't know (Learned / SRS); within a level, the less known first.
 */
export function difficultyScore(stats: PageStats, view: PageStatsView): number {
	const unknown = 100 - stats.learnedPercent;
	if (view === 'learned') return unknown;
	if (view === 'srs') return 100 - srsWeightedPercent(stats);
	const order = view === 'jlpt' ? JLPT_ORDER : JOYO_ORDER;
	const label = view === 'jlpt' ? stats.level : joyoLevel(stats.joyo, stats.total);
	return order.indexOf(label) * 100 + unknown;
}

/** The badges a view can show, easiest first (the history's filter). */
export function viewBadgeLabels(view: PageStatsView): string[] {
	if (view === 'jlpt') return JLPT_ORDER;
	if (view === 'joyo') return JOYO_ORDER;
	return ['Easy', 'Comfortable', 'Challenging', 'Hard'];
}

/** The highlight's color mode → the matching classification. */
const VIEW_OF_HIGHLIGHT: Record<string, PageStatsView> = {
	learned: 'learned',
	srs_stage: 'srs',
	jlpt: 'jlpt',
	joyo: 'joyo',
};

/** What the highlight colors by. */
export function highlightView(settings: any): PageStatsView {
	return VIEW_OF_HIGHLIGHT[settings?.highlighter?.color_by ?? 'learned'] ?? 'learned';
}

/**
 * The classification shown: the one chosen (Settings, or a row of the bar's panel), else
 * ('auto', the default) the same as the highlight.
 */
export function resolvePageStatsView(settings: any): PageStatsView {
	const view = settings?.page_stats?.view;
	return ['learned', 'srs', 'jlpt', 'joyo'].includes(view) ? view : highlightView(settings);
}

export const PAGE_STATS_VIEWS: Array<{ id: PageStatsView; label: string }> = [
	{ id: 'learned', label: 'Learned' },
	{ id: 'srs', label: 'SRS' },
	{ id: 'jlpt', label: 'JLPT' },
	{ id: 'joyo', label: 'Jōyō' },
];
