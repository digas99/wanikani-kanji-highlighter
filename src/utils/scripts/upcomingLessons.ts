import { fastestGuruAt } from './wanikani';

const isUnlocked = (assignment: any) => Boolean(assignment && (assignment.srs_stage != null || assignment.passed_at));

export type UpcomingLesson = { subject: any; unlockAt: number };

/**
 * The lessons to come: a level's subjects not unlocked yet, each with the earliest time it can
 * unlock. A kanji unlocks when its radicals reach Guru, a word when its kanji do; "earliest":
 * every lesson and review done as soon as it's available, and answered right (as the level-up
 * prediction, getLevelUpPrediction). A part that's itself locked (a kanji of a word) counts its
 * own unlock first. Subjects whose parts can't be predicted (a later level's) are left out.
 *
 * `assignmentOf` / `levelOf`: for parts from other levels (not in `subjects`).
 */
export function upcomingLessons(
	subjects: Array<any>,
	{ assignmentOf, levelOf }: { assignmentOf?: (id: number) => any; levelOf?: (id: number) => number | undefined } = {},
	now = Date.now(),
): UpcomingLesson[] {
	const byId = new Map(subjects.map(subject => [subject.id, subject]));
	const guruCache = new Map<number, number>();
	const unlockCache = new Map<number, number>();

	const unlockAt = (subject: any): number => {
		if (unlockCache.has(subject.id)) return unlockCache.get(subject.id)!;
		// a loop can't happen (parts are always simpler), but don't recurse into one anyway
		unlockCache.set(subject.id, Infinity);
		const parts: number[] = subject.component_subject_ids ?? [];
		const time = parts.length ? Math.max(now, ...parts.map(guruAt)) : Infinity;
		unlockCache.set(subject.id, time);
		return time;
	};

	const guruAt = (id: number): number => {
		if (guruCache.has(id)) return guruCache.get(id)!;
		const subject = byId.get(id);
		const assignment = subject?.assignment ?? assignmentOf?.(id);
		const level = subject?.level ?? levelOf?.(id) ?? 1;
		let time: number;
		if (isUnlocked(assignment)) time = fastestGuruAt(assignment, level, now);
		// locked: once it unlocks, a full Apprentice → Guru path (only for parts we know)
		else if (subject) time = fastestGuruAt(null, level, now, unlockAt(subject));
		else time = Infinity;
		guruCache.set(id, time);
		return time;
	};

	return subjects
		// retired by WaniKani (hidden_at): never a lesson
		.filter(subject => !subject.hidden_at && !subject.assignment?.hidden && !isUnlocked(subject.assignment))
		// radicals (and kana-only words) unlock with the level, not their parts
		.filter(subject => subject.type === 'kanji' || subject.type === 'vocabulary')
		.map(subject => ({ subject, unlockAt: unlockAt(subject) }))
		.filter(entry => Number.isFinite(entry.unlockAt))
		.sort((a, b) => a.unlockAt - b.unlockAt);
}
