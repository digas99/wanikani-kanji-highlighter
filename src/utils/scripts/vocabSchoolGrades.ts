import jlptVocab from '@/utils/scripts/jlptVocab.json';
import {
	enrichSubjectsWithSchoolGrades,
	getSchoolKanjiMapsSync,
	type SchoolKanjiMaps,
} from '@/utils/scripts/schoolKanji';
import {
	createEmptyVocabByJlpt,
	createEmptyVocabByJoyo,
	JLPT_GRADE_KEYS,
	JOYO_GRADE_KEYS,
	type JlptGradeKey,
	type JoyoGradeKey,
} from '@/utils/highlight/schoolGradeHighlight';

/**
 * JLPT levels and Jōyō grades for words (vocabulary), next to the kanji ones (schoolKanji.ts):
 * - JLPT: from Jonathan Waller's lists (jlptVocab.json, see scripts/build-jlpt-vocab.mjs);
 * - Jōyō: the grade of the word's hardest kanji (none if one of its kanji isn't Jōyō, or it has none).
 * Kept out of schoolKanji.ts, which the page's highlighter loads: the list is only read here
 * (popup, background), the page gets the words already sorted (highlight data).
 */

const KANJI = /[㐀-䶿一-鿿豈-﫿]/g;

let jlptByWord: Map<string, JlptGradeKey> | null = null;
function jlptMap(): Map<string, JlptGradeKey> {
	if (jlptByWord) return jlptByWord;
	jlptByWord = new Map();
	for (const grade of JLPT_GRADE_KEYS as JlptGradeKey[]) {
		for (const word of (jlptVocab as Record<string, string[] | string>)[grade] as string[]) jlptByWord.set(word, grade);
	}
	return jlptByWord;
}

/** WaniKani writes some words differently from the lists: 〜 prefixes, する verbs. */
function candidates(characters: string): string[] {
	const plain = characters.replace(/[〜~]/g, '');
	const forms = [characters, plain];
	if (plain.endsWith('する') && plain.length > 2) forms.push(plain.slice(0, -2));
	return forms;
}

export function vocabJlptGrade(characters: string | undefined): JlptGradeKey | null {
	if (!characters) return null;
	const map = jlptMap();
	for (const form of candidates(characters)) {
		const grade = map.get(form);
		if (grade) return grade;
	}
	return null;
}

/** kanji → its grade's position (g1 = 0 … g9 = 6), per set of maps */
const joyoIndexes = new WeakMap<SchoolKanjiMaps, Map<string, number>>();
function joyoIndex(maps: SchoolKanjiMaps): Map<string, number> {
	let index = joyoIndexes.get(maps);
	if (!index) {
		index = new Map();
		JOYO_GRADE_KEYS.forEach((grade, position) => {
			for (const char of maps.joyo[grade] ?? []) index!.set(char, position);
		});
		joyoIndexes.set(maps, index);
	}
	return index;
}

/** kanji → its JLPT level, per set of maps */
const jlptIndexes = new WeakMap<SchoolKanjiMaps, Map<string, JlptGradeKey>>();

/** A kanji's JLPT level / Jōyō grade (null: not in the lists). */
export function kanjiJlptGrade(char: string, maps: SchoolKanjiMaps = getSchoolKanjiMapsSync()): JlptGradeKey | null {
	let index = jlptIndexes.get(maps);
	if (!index) {
		index = new Map();
		for (const grade of JLPT_GRADE_KEYS as JlptGradeKey[]) {
			for (const kanji of maps.jlpt[grade] ?? []) index.set(kanji, grade);
		}
		jlptIndexes.set(maps, index);
	}
	return index.get(char) ?? null;
}

export function kanjiJoyoGrade(char: string, maps: SchoolKanjiMaps = getSchoolKanjiMapsSync()): JoyoGradeKey | null {
	const position = joyoIndex(maps).get(char);
	return position === undefined ? null : JOYO_GRADE_KEYS[position] as JoyoGradeKey;
}

export function vocabJoyoGrade(characters: string | undefined, maps: SchoolKanjiMaps = getSchoolKanjiMapsSync()): JoyoGradeKey | null {
	const kanji = characters?.match(KANJI);
	if (!kanji?.length) return null;
	const index = joyoIndex(maps);
	let hardest = -1;
	for (const char of kanji) {
		const position = index.get(char);
		// a kanji outside the Jōyō list: the word isn't Jōyō
		if (position === undefined) return null;
		hardest = Math.max(hardest, position);
	}
	return JOYO_GRADE_KEYS[hardest] as JoyoGradeKey;
}

/** The page highlighter's word groups (highlight data `vocabulary.byJlpt` / `byJoyo`). */
function groupWords<K extends string>(
	subjects: Array<{ characters?: string }>,
	empty: Record<K, string[]>,
	gradeOf: (characters: string) => K | null,
): Record<K, string[]> {
	const sets = new Map<K, Set<string>>();
	for (const subject of subjects) {
		if (!subject.characters) continue;
		const grade = gradeOf(subject.characters);
		if (!grade) continue;
		if (!sets.has(grade)) sets.set(grade, new Set());
		sets.get(grade)!.add(subject.characters);
	}
	for (const [grade, words] of sets) empty[grade] = Array.from(words);
	return empty;
}

export function buildVocabByJlpt(subjects: Array<{ characters?: string }>): Record<JlptGradeKey, string[]> {
	return groupWords(subjects, createEmptyVocabByJlpt(), vocabJlptGrade);
}

export function buildVocabByJoyo(subjects: Array<{ characters?: string }>, maps: SchoolKanjiMaps = getSchoolKanjiMapsSync()): Record<JoyoGradeKey, string[]> {
	return groupWords(subjects, createEmptyVocabByJoyo(), characters => vocabJoyoGrade(characters, maps));
}

function isVocabulary(subject: any): boolean {
	const type = subject?.type ?? subject?.subject_type;
	return type === 'vocabulary' || type === 'kana_vocabulary';
}

/**
 * Kanji and words with their JLPT / Jōyō labels ("N3", "Grade 4"), as the subject details and
 * the lists show them.
 */
export function enrichWithSchoolGrades<T extends Array<any>>(subjects: T, maps: SchoolKanjiMaps = getSchoolKanjiMapsSync()): T {
	enrichSubjectsWithSchoolGrades(subjects, maps);
	for (const subject of subjects) {
		if (!isVocabulary(subject) || !subject.characters) continue;
		const jlpt = vocabJlptGrade(subject.characters);
		const joyo = vocabJoyoGrade(subject.characters, maps);
		if (jlpt) subject.jlpt = jlpt.toUpperCase();
		else delete subject.jlpt;
		if (joyo) subject.joyo = `Grade ${joyo.charAt(1)}`;
		else delete subject.joyo;
	}
	return subjects;
}

export function enrichOneWithSchoolGrades<T>(subject: T, maps?: SchoolKanjiMaps): T {
	if (subject) enrichWithSchoolGrades([subject], maps);
	return subject;
}
