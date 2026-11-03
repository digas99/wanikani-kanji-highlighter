import { storage } from '#imports';
import { createWKManager } from '@/lib/apiClient';
import {
	buildJapaneseKanji,
	buildKanjiByJlpt,
	buildKanjiByJoyo,
} from '@/utils/highlight/schoolGradeHighlight';
import {
	createEmptyKanjiByStage,
	createEmptyVocabByStage,
	srsStageKeyFromSubject,
} from '@/utils/highlight/srsStageHighlight';
import { getSchoolKanjiMapsSync } from '@/utils/scripts/schoolKanji';
import { buildVocabByJlpt, buildVocabByJoyo } from '@/utils/scripts/vocabSchoolGrades';
import { getAllCacheLevels } from '@/utils/scripts/subjectCache';
import { inflectionOf } from '@/utils/highlight/deinflect';

type WKManager = ReturnType<typeof createWKManager>;

function withoutTimestamp(data: any): string {
	if (!data) return '';
	const { updatedAt: _ignored, ...rest } = data;
	return JSON.stringify(rest);
}

/**
 * Store highlight data only when it actually changed. Every write notifies all
 * open tabs, so rewriting identical data (just a new `updatedAt`) made pages re-highlight.
 */
export async function writeHighlightDataIfChanged(data: Record<string, unknown>): Promise<boolean> {
	const current = await storage.getItem<any>('local:highlightData');
	if (current && withoutTimestamp(current) === withoutTimestamp(data)) return false;
	await storage.setItem('local:highlightData', data);
	return true;
}
type Assignment = { subject_id: number; srs_stage?: number | null };

async function readSubjectsByTypes(
	manager: WKManager,
	types: string[],
): Promise<Array<any>> {
	try {
		const idGroups = await Promise.all(
			types.map(type => manager.storage.getIdsByTypeAndLevel(type, getAllCacheLevels())),
		);
		const ids = idGroups.flat();
		return ids.length ? await manager.readSubjectsById(ids) : [];
	} catch {
		return [];
	}
}

/** word → its kinds (godan, ichidan, い adjective, する…), for the words that conjugate */
export function inflectionsOf(subjects: Array<any>): Record<string, number> {
	const inflections: Record<string, number> = {};
	for (const subject of subjects) {
		const word = subject.characters;
		if (!word) continue;
		const kind = inflectionOf(word, subject.parts_of_speech ?? subject.data?.parts_of_speech);
		if (kind) inflections[word] = (inflections[word] ?? 0) | kind;
	}
	return inflections;
}

/** Build and persist highlight sets used by the content-script highlighter. */
export async function persistHighlightDataFromCache(
	manager: WKManager,
	assignments: Assignment[] = [],
): Promise<void> {
	const learnedAssignmentIds = new Set(
		assignments
			.filter(a => a.srs_stage != null && a.srs_stage >= 1)
			.map(a => a.subject_id),
	);

	const splitByLearned = (subjects: Array<any>) => {
		const learned = new Set<string>();
		const notLearned = new Set<string>();
		for (const subject of subjects) {
			const chars = subject.characters;
			if (!chars) continue;
			const srs = subject.assignment?.srs_stage;
			const isLearned = learnedAssignmentIds.has(subject.id) || (srs != null && srs >= 1);
			(isLearned ? learned : notLearned).add(chars);
		}
		return { learned, notLearned };
	};

	const splitBySrsStageKanji = (subjects: Array<any>) => {
		const byStage = createEmptyKanjiByStage();
		const charSets = Object.fromEntries(
			Object.keys(byStage).map(key => [key, new Set<string>()]),
		) as Record<string, Set<string>>;
		for (const subject of subjects) {
			const chars = subject.characters;
			if (!chars) continue;
			const key = srsStageKeyFromSubject(subject);
			for (const char of chars) charSets[key].add(char);
		}
		for (const key of Object.keys(byStage)) {
			byStage[key as keyof typeof byStage] = Array.from(charSets[key]).join('');
		}
		return byStage;
	};

	const splitBySrsStageVocab = (subjects: Array<any>) => {
		const byStage = createEmptyVocabByStage();
		for (const subject of subjects) {
			const chars = subject.characters;
			if (!chars) continue;
			const key = srsStageKeyFromSubject(subject);
			if (!byStage[key].includes(chars)) byStage[key].push(chars);
		}
		return byStage;
	};

	const [kanjiSubjects, vocabSubjects] = await Promise.all([
		readSubjectsByTypes(manager, ['kanji']),
		readSubjectsByTypes(manager, ['vocabulary', 'kana_vocabulary']),
	]);

	const kanji = splitByLearned(kanjiSubjects);
	const vocab = splitByLearned(vocabSubjects);
	const schoolMaps = getSchoolKanjiMapsSync();

	await writeHighlightDataIfChanged({
		kanji: {
			learned: Array.from(kanji.learned).join(''),
			notLearned: Array.from(kanji.notLearned).join(''),
			byStage: splitBySrsStageKanji(kanjiSubjects),
			byJlpt: buildKanjiByJlpt(schoolMaps),
			byJoyo: buildKanjiByJoyo(schoolMaps),
			japanese: buildJapaneseKanji(schoolMaps),
		},
		vocabulary: {
			learned: Array.from(vocab.learned),
			notLearned: Array.from(vocab.notLearned),
			// how the verbs and adjectives conjugate (deinflect.ts): 話していました finds 話す
			inflections: inflectionsOf(vocabSubjects),
			byStage: splitBySrsStageVocab(vocabSubjects),
			byJlpt: buildVocabByJlpt(vocabSubjects),
			byJoyo: buildVocabByJoyo(vocabSubjects, schoolMaps),
		},
		updatedAt: Date.now(),
	});
}
