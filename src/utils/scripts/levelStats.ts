export type LevelProgressionEntry = {
	level: number;
	unlocked_at: string;
	passed_at: string | null;
	abandoned_at?: string | null;
};

export type LevelsStats = Record<string, LevelProgressionEntry[]>;

/** Newest learning streak at index 0, matching v1.5 streak selector behavior. */
export function normalizeLevelsStats(levelsStats: LevelsStats): LevelsStats {
	const normalized: LevelsStats = {};

	for (const [level, entries] of Object.entries(levelsStats)) {
		normalized[level] = [...entries].sort(
			(a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime(),
		);
	}

	return normalized;
}

export function getLevelStatsEntries(
	levelsStats: LevelsStats | null | undefined,
	level: number,
): LevelProgressionEntry[] {
	if (!levelsStats) return [];
	return levelsStats[level] ?? levelsStats[String(level)] ?? [];
}

export function levelDurationDays(entry: LevelProgressionEntry): number {
	const startedAt = new Date(entry.unlocked_at);
	const endedAt = entry.passed_at ? new Date(entry.passed_at) : new Date();
	return (endedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24);
}

export function mostLearningStreaks(levelsStats: LevelsStats | null | undefined): number {
	if (!levelsStats) return 1;

	let max = 1;
	Object.values(levelsStats).forEach(entries => {
		if (entries.length > max) max = entries.length;
	});
	return max;
}

export function getChartLevelData(
	levelsStats: LevelsStats,
	resetIndex: number,
	numberLevelsToDisplay: number,
) {
	const labels = Object.keys(levelsStats)
		.filter(level => levelsStats[level]?.[resetIndex])
		.slice(-numberLevelsToDisplay);

	const data = Object.values(levelsStats)
		.filter(entry => entry[resetIndex])
		.map(entry => Number(levelDurationDays(entry[resetIndex]).toFixed(0)))
		.slice(-numberLevelsToDisplay);

	return { labels, data };
}

export function formatStreakDate(value: string | Date | null | undefined): string {
	if (!value) return 'now';
	const iso = value instanceof Date ? value.toISOString() : value;
	return iso.split('T')[0];
}

export function streakDates(levelsStats: LevelsStats, streakIndex: number) {
	const levelOneEntry = getLevelStatsEntries(levelsStats, 1)[streakIndex];
	const streakBeginning = levelOneEntry
		? new Date(levelOneEntry.unlocked_at)
		: new Date();

	const levelsWithStreak = Object.keys(levelsStats)
		.map(Number)
		.filter(level => getLevelStatsEntries(levelsStats, level)[streakIndex]);

	let streakEnding: Date | null = null;
	if (levelsWithStreak.length) {
		const maxLevel = Math.max(...levelsWithStreak);
		const latestEntry = getLevelStatsEntries(levelsStats, maxLevel)[streakIndex];
		if (latestEntry?.abandoned_at) {
			streakEnding = new Date(latestEntry.abandoned_at);
		}
	}

	return { streakBeginning, streakEnding };
}

export function getLevelPassProgress(
	level: number,
	assignments: Array<{ subject_id: number; hidden?: boolean; passed_at?: string | null }>,
	levelBySubjectId: Map<number, number>,
) {
	const levelAssignments = assignments.filter(assignment => {
		if (assignment.hidden) return false;
		return levelBySubjectId.get(assignment.subject_id) === level;
	});

	const passed = levelAssignments.filter(assignment => assignment.passed_at).length;
	const total = levelAssignments.length;
	const percentage = total ? (passed / total) * 100 : 0;

	return { passed, total, percentage };
}
