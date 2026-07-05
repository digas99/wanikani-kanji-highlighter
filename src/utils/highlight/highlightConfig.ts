/**
 * Build highlight config from extension settings + mirrored highlight data.
 */

import type { HighlightColorBy, HighlightConfig } from './highlighter';
import {
	buildStageColorMap,
	createEmptyKanjiByStage,
	createEmptyVocabByStage,
	type SrsStageKey,
} from './srsStageHighlight';
import {
	buildSchoolGradeColorMap,
	createEmptyKanjiByJlpt,
	createEmptyKanjiByJoyo,
	JLPT_GRADE_SECTIONS,
	JOYO_GRADE_SECTIONS,
	type JlptGradeKey,
	type JoyoGradeKey,
} from './schoolGradeHighlight';

export type HighlightData = {
	kanji: {
		learned: string;
		notLearned: string;
		byStage?: Partial<Record<SrsStageKey, string>>;
		byJlpt?: Partial<Record<JlptGradeKey, string>>;
		byJoyo?: Partial<Record<JoyoGradeKey, string>>;
	};
	vocabulary: {
		learned: string[];
		notLearned: string[];
		byStage?: Partial<Record<SrsStageKey, string[]>>;
	};
	updatedAt?: number;
};

function resolveColorBy(config: any, target: string): HighlightColorBy {
	const raw = config.color_by;
	if ((raw === 'jlpt' || raw === 'joyo') && target !== 'kanji') {
		return 'learned';
	}
	if (raw === 'srs_stage' || raw === 'jlpt' || raw === 'joyo') return raw;
	return 'learned';
}

export function buildHighlightConfig(
	settings: any,
	data: HighlightData | null | undefined,
): HighlightConfig | null {
	if (!settings || !data) return null;

	const config = settings.highlighter ?? {};
	if (config.enabled === false) return null;

	const target = config.target === 'vocabulary' || config.target === 'mixed'
		? config.target
		: 'kanji';
	const style = settings.highlight_style ?? {};
	const colorBy = resolveColorBy(config, target);
	const appearance = settings.appearance ?? {};

	const kanjiByStage = { ...createEmptyKanjiByStage(), ...(data.kanji?.byStage ?? {}) };
	const vocabByStage = { ...createEmptyVocabByStage(), ...(data.vocabulary?.byStage ?? {}) };
	const kanjiByJlpt = { ...createEmptyKanjiByJlpt(), ...(data.kanji?.byJlpt ?? {}) };
	const kanjiByJoyo = { ...createEmptyKanjiByJoyo(), ...(data.kanji?.byJoyo ?? {}) };

	return {
		target,
		colorBy,
		learnedChars: data.kanji?.learned || '',
		notLearnedChars: data.kanji?.notLearned || '',
		learnedWords: data.vocabulary?.learned || [],
		notLearnedWords: data.vocabulary?.notLearned || [],
		kanjiByStage,
		vocabByStage,
		kanjiByJlpt,
		kanjiByJoyo,
		stageColors: buildStageColorMap(appearance),
		gradeColors: {
			...buildSchoolGradeColorMap(JLPT_GRADE_SECTIONS),
			...buildSchoolGradeColorMap(JOYO_GRADE_SECTIONS),
		},
		learnedClass: style.learned || 'wkhighlighter_highlighted',
		notLearnedClass: style.not_learned || 'wkhighlighter_highlightedNotLearned',
		srsStyleClass: style.learned || 'wkhighlighter_highlighted',
		highlightLearned: config.show_learned !== false,
		highlightNotLearned: config.show_not_learned !== false,
	};
}
