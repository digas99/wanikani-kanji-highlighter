import { correctnessColor } from '@/utils/scripts/common';

export type SubjectHistoryEntry = {
	id: number;
	characters?: string;
	type?: string;
};

export type ReviewStats = {
	meaning_correct: number;
	meaning_incorrect: number;
	meaning_current_streak: number;
	meaning_max_streak: number;
	reading_correct: number;
	reading_incorrect: number;
	reading_current_streak: number;
	reading_max_streak: number;
	percentage_correct: number;
};

export type AssignmentTimestamps = Record<string, string | null | undefined>;

export function getSubjectType(subject: any): string {
	return subject?.type ?? subject?.subject_type ?? '';
}

export function getRelatedSubjectIds(subject: any): number[] {
	const type = getSubjectType(subject);
	const ids: number[] = [];

	switch (type) {
		case 'radical':
			ids.push(...(subject.amalgamation_subject_ids ?? []));
			break;
		case 'kanji':
			ids.push(
				...(subject.amalgamation_subject_ids ?? []),
				...(subject.component_subject_ids ?? []),
				...(subject.visually_similar_subject_ids ?? []),
			);
			break;
		case 'vocabulary':
		case 'kana_vocabulary':
			ids.push(...(subject.component_subject_ids ?? []));
			break;
		default:
			break;
	}

	return [...new Set(ids.filter((id: unknown) => Number.isFinite(Number(id))).map(Number))];
}

export function buildAssignmentTimestamps(assignment: any): AssignmentTimestamps | null {
	if (!assignment) return null;

	return {
		data_updated_at: assignment.data_updated_at,
		available_at: assignment.available_at,
		burned_at: assignment.burned_at,
		created_at: assignment.created_at,
		passed_at: assignment.passed_at,
		resurrected_at: assignment.resurrected_at,
		started_at: assignment.started_at,
		unlocked_at: assignment.unlocked_at,
	};
}

export function getReviewStats(reviews: any): ReviewStats | null {
	if (!reviews || typeof reviews !== 'object') return null;

	const meaningCorrect = Number(reviews.meaning_correct) || 0;
	const meaningIncorrect = Number(reviews.meaning_incorrect) || 0;
	const readingCorrect = Number(reviews.reading_correct) || 0;
	const readingIncorrect = Number(reviews.reading_incorrect) || 0;
	const total = meaningCorrect + meaningIncorrect + readingCorrect + readingIncorrect;

	if (total <= 0 && reviews.percentage_correct == null) return null;

	return {
		meaning_correct: meaningCorrect,
		meaning_incorrect: meaningIncorrect,
		meaning_current_streak: Number(reviews.meaning_current_streak) || 0,
		meaning_max_streak: Number(reviews.meaning_max_streak) || 0,
		reading_correct: readingCorrect,
		reading_incorrect: readingIncorrect,
		reading_current_streak: Number(reviews.reading_current_streak) || 0,
		reading_max_streak: Number(reviews.reading_max_streak) || 0,
		percentage_correct: Number(reviews.percentage_correct)
			|| Math.round(((meaningCorrect + readingCorrect) / Math.max(total, 1)) * 100),
	};
}

export function hasReviewActivity(stats: ReviewStats | null): boolean {
	if (!stats) return false;
	return stats.meaning_correct + stats.meaning_incorrect + stats.reading_correct + stats.reading_incorrect > 0;
}

/** True when review statistics are present on the merged subject. */
export function hasCachedReviewStats(reviews: any): boolean {
	return getReviewStats(reviews) != null;
}

type ReviewStatsOptions = {
	/** When false, only read cached review stats — no API refresh. */
	allowNetwork?: boolean;
};

/** Fetch review_statistics for one subject when materials exist but stats were never synced. */
export async function ensureSubjectReviewStats(
	manager: any,
	subject: any,
	options: ReviewStatsOptions = {},
): Promise<any> {
	const { allowNetwork = true } = options;
	if (!subject?.id || !manager) return subject;
	if (getReviewStats(subject.reviews)) return subject;

	if (allowNetwork) {
		try {
			await manager.updateReviewsBySubjectId(subject.id);
		} catch {
			// continue with cache read / full refresh below
		}
	}

	let [updated] = await manager.readSubjectsById(subject.id);
	if (getReviewStats(updated?.reviews)) return updated ?? subject;

	if (allowNetwork) {
		try {
			// Blocking refresh — the noop callback only returns stale cache.
			const fetched = await manager.getSubjectsById(subject.id, null);
			updated = fetched?.[0];
			if (getReviewStats(updated?.reviews)) return updated ?? subject;
		} catch {
			// continue with direct storage read below
		}
	}

	try {
		const rows = await manager.storage?.getReviewsBySubjectId?.(subject.id);
		const row = Array.isArray(rows) ? rows[0] : rows;
		if (row && getReviewStats(row)) {
			return { ...(updated ?? subject), reviews: row };
		}
	} catch {
		// ignore storage errors
	}

	return updated ?? subject;
}

export function reviewPercentage(stats: ReviewStats, field: 'meaning' | 'reading' | 'overall'): number {
	if (field === 'overall') return stats.percentage_correct;

	const correct = stats[`${field}_correct`];
	const incorrect = stats[`${field}_incorrect`];
	const total = correct + incorrect;
	if (total <= 0) return 0;
	return Math.round((correct / total) * 100);
}

export { correctnessColor as reviewPercentageColor };

export function formatTimestampLabel(key: string): string {
	if (key === 'data_updated_at') return 'Last Session';
	return key.split('_')[0].charAt(0).toUpperCase() + key.split('_')[0].slice(1);
}

export function formatTimestampValue(value: string | null | undefined): string {
	if (!value) return 'No Data';
	return value.split('.')[0]?.replace('T', '  ') ?? 'No Data';
}

export function formatDaysPassed(value: string | null | undefined): string {
	if (!value) return '';
	const diff = Date.now() - new Date(value).getTime();
	if (!Number.isFinite(diff) || diff < 0) return '';

	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((diff % (1000 * 60)) / 1000);

	if (days > 0) return `${days}d ${hours}h ago`;
	if (hours > 0) return `${hours}h ${minutes}m ago`;
	if (minutes > 0) return `${minutes}m ${seconds}s ago`;
	return `${Math.max(seconds, 1)}s ago`;
}

export function getCardSections(subject: any, related: Record<number, any>) {
	const sections: Array<{
		key: string;
		title: string;
		rowClass: string;
		ids: number[];
		sortByLevel?: boolean;
	}> = [];

	const type = getSubjectType(subject);

	if (subject.component_subject_ids?.length) {
		sections.push({
			key: 'component_subject_ids',
			title: type === 'kanji' ? 'Used Radicals' : 'Used Kanji',
			rowClass: type === 'kanji' ? 'sd-detailsPopup_radicals_row' : 'sd-detailsPopup_kanji_row',
			ids: subject.component_subject_ids,
			sortByLevel: type !== 'kanji',
		});
	}

	if (subject.visually_similar_subject_ids?.length) {
		sections.push({
			key: 'visually_similar_subject_ids',
			title: 'Similar Kanji',
			rowClass: 'sd-detailsPopup_kanji_row',
			ids: subject.visually_similar_subject_ids,
		});
	}

	if (subject.amalgamation_subject_ids?.length) {
		sections.push({
			key: 'amalgamation_subject_ids',
			title: type === 'radical' ? 'Used Kanji' : 'Included in Subjects',
			rowClass: 'sd-detailsPopup_kanji_row',
			ids: subject.amalgamation_subject_ids,
			sortByLevel: type !== 'radical',
		});
	}

	return sections
		.map(section => ({
			...section,
			items: section.ids
				.map((id: number) => related[id])
				.filter(Boolean)
				.sort((a: any, b: any) => (section.sortByLevel ? (a.level ?? 0) - (b.level ?? 0) : 0)),
		}))
		.filter(section => section.items.length > 0);
}

export function getCardTextRows(subject: any): string[] {
	const rows: string[] = [];
	if (subject.meanings?.length) rows.push(subject.meanings[0].meaning);

	if (subject.readings?.length) {
		if (getSubjectType(subject) === 'kanji') {
			const primary = subject.readings.find((reading: any) => reading.primary);
			if (primary?.reading) rows.push(primary.reading);
		} else {
			rows.push(subject.readings[0].reading ?? subject.readings[0]);
		}
	}

	return rows.filter(Boolean);
}

export const POPUP_KANJI_BASE_FONT_PX = 60;
export const POPUP_COMPACT_DEFAULT_WIDTH_PX = 150;

/** v1.5 kanji header scaling for long vocabulary/kana strings. */
export function getPopupKanjiFontSizePx(characters?: string | null): number {
	const length = characters?.length ?? 0;
	if (length <= 4) return POPUP_KANJI_BASE_FONT_PX;
	return Math.max(18, 48 - 6 * (length - 5));
}

/** v1.5 compact popup width: widen when the subject has 3+ characters. */
export function getCompactPopupWidthPx(
	characters?: string | null,
	configuredWidth = 300,
): number {
	const length = characters?.length ?? 0;
	if (length >= 3) return configuredWidth;
	return POPUP_COMPACT_DEFAULT_WIDTH_PX;
}

/** v1.5 dmak sizing, capped so all character SVGs fit on one row. */
export function getDmakStrokeSizePx(characters: string, containerWidth: number): number {
	const count = characters.length;
	if (!count) return 80;

	const lengthBased = 130 - 10 * count;
	const gap = Math.max(0, count - 1) * 4;
	const available = Math.max(containerWidth - 30 - gap, 40);
	const widthBased = Math.floor(available / count);

	return Math.max(20, Math.min(lengthBased, widthBased));
}

export function formatSubjectSchoolGrades(subject: any): string | null {
	const parts = [subject?.jlpt, subject?.joyo].filter(Boolean);
	return parts.length ? parts.join(', ') : null;
}

export function popupIconUrl(path: string): string {
	try {
		return (browser.runtime.getURL as (resourcePath: string) => string)(path);
	} catch {
		return path;
	}
}
