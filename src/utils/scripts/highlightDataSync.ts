import { storage } from '#imports';
import { createWKManager } from '@/lib/apiClient';
import {
	buildKanjiByJlpt,
	buildKanjiByJoyo,
} from '@/utils/highlight/schoolGradeHighlight';
import {
	createEmptyKanjiByStage,
	createEmptyVocabByStage,
	srsStageKeyFromSubject,
} from '@/utils/highlight/srsStageHighlight';
import { getSchoolKanjiMapsSync } from '@/utils/scripts/schoolKanji';
import { getAllCacheLevels } from '@/utils/scripts/subjectCache';

type WKManager = ReturnType<typeof createWKManager>;
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

	await storage.setItem('local:highlightData', {
		kanji: {
			learned: Array.from(kanji.learned).join(''),
			notLearned: Array.from(kanji.notLearned).join(''),
			byStage: splitBySrsStageKanji(kanjiSubjects),
			byJlpt: buildKanjiByJlpt(schoolMaps),
			byJoyo: buildKanjiByJoyo(schoolMaps),
		},
		vocabulary: {
			learned: Array.from(vocab.learned),
			notLearned: Array.from(vocab.notLearned),
			byStage: splitBySrsStageVocab(vocabSubjects),
		},
		updatedAt: Date.now(),
	});
}
