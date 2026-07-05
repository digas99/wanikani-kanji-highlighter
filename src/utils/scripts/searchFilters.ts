import type { SettingsState } from '@/utils/scripts/defaultSettings';

export type SearchFilterOptions = Pick<
	SettingsState['search'],
	| 'disabled_subjects'
	| 'radicals'
	| 'kanji'
	| 'vocabulary'
	| 'passed'
	| 'in_progress'
	| 'locked'
>;

type SearchSubject = {
	type?: string;
	hidden_at?: string | null;
	assignment?: {
		srs_stage?: number;
		passed_at?: string | null;
	};
};

function getSrsStage(item: SearchSubject): number {
	const stage = item.assignment?.srs_stage;
	return stage != null ? stage : -1;
}

function getSubjectType(item: SearchSubject): string {
	if (item.type === 'kana_vocabulary') return 'vocabulary';
	return item.type ?? '';
}

export function searchFilters(item: SearchSubject, options: SearchFilterOptions): boolean {
	if (options.disabled_subjects === false && item.hidden_at) return false;
	if (options.passed === false && item.assignment?.passed_at) return false;

	const srsStage = getSrsStage(item);
	if (options.in_progress === false && srsStage >= 0 && srsStage < 5) return false;
	if (options.locked === false && srsStage === -1) return false;

	const subjectType = getSubjectType(item);
	if (options.radicals && subjectType === 'radical') return true;
	if (options.kanji && subjectType === 'kanji') return true;
	if (options.vocabulary && subjectType === 'vocabulary') return true;
	return false;
}

export function filterSearchResults<T extends SearchSubject>(
	results: T[],
	options: SearchFilterOptions,
): T[] {
	return results.filter(item => searchFilters(item, options));
}
