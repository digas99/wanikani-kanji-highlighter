import type { LevelsStats } from './levelStats';
import { JLPT_READY_SHARE, SCHOOL_CONFIG, getSchoolKanjiSubjects, subjectMatchesSchoolGrade, type SchoolKey } from './schoolKanji';

/**
 * Projections: when you'd reach level 60, or each JLPT level / Jōyō grade (as the readiness on
 * the JLPT & Jōyō page counts it: 80% of its kanji and 70% of its words passed, with the easier
 * ones'), going at a pace per level.
 *
 * A target needs the WaniKani levels that teach enough of its subjects; a level's subjects are
 * counted as passed once you're on the level after it.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** the fastest possible level (3+): Apprentice → Guru twice (radicals, then kanji) */
export const FASTEST_LEVEL_DAYS = 6.83;
/** levels averaged for "your pace" */
const RECENT_LEVELS = 10;

const isPassed = (subject: any) => Boolean(subject.assignment?.passed_at) || subject.assignment?.srs_stage === 9;

/**
 * The lowest WaniKani level whose subjects (with the easier levels') make `share` of the list
 * passed. 0: there already. Infinity: WaniKani alone doesn't get there.
 */
function levelForShare(subjects: any[], share: number): number {
	if (!subjects.length) return 0;
	const needed = Math.ceil(subjects.length * share);
	let passed = subjects.filter(isPassed).length;
	if (passed >= needed) return 0;
	const levels = subjects.filter(subject => !isPassed(subject)).map(subject => Number(subject.level) || Infinity).sort((a, b) => a - b);
	for (const level of levels) {
		passed += 1;
		if (passed >= needed) return level;
	}
	return Infinity;
}

export type ProjectionTarget = {
	key: string;
	label: string;
	group: 'WaniKani' | 'JLPT' | 'Jōyō';
	/** the WaniKani level to be on (its previous ones passed); 0: there already */
	level: number;
};

/** The targets: level 60 passed, every JLPT level, every Jōyō grade. */
export function projectionTargets(subjects: any[]): ProjectionTarget[] {
	const targets: ProjectionTarget[] = [{ key: 'wk60', label: 'Level 60 passed', group: 'WaniKani', level: 61 }];
	for (const school of ['jlpt', 'joyo'] as SchoolKey[]) {
		const kanji = getSchoolKanjiSubjects(subjects, school, 'kanji');
		const words = getSchoolKanjiSubjects(subjects, school, 'vocabulary');
		const grades = SCHOOL_CONFIG[school].grades;
		grades.forEach((grade, index) => {
			const upTo = grades.slice(0, index + 1);
			const inList = (subject: any) => upTo.some(entry => subjectMatchesSchoolGrade(subject, school, entry));
			const level = Math.max(
				levelForShare(kanji.filter(inList), JLPT_READY_SHARE.kanji),
				levelForShare(words.filter(inList), JLPT_READY_SHARE.words),
			);
			targets.push({
				key: `${school}-${grade}`,
				label: school === 'jlpt' ? SCHOOL_CONFIG.jlpt.gradeLabel(grade) : grade === 'g9' ? 'All Jōyō' : `Grade ${grade.charAt(1)}`,
				group: school === 'jlpt' ? 'JLPT' : 'Jōyō',
				// on the level after the one teaching the last subjects needed
				level: level ? level + 1 : 0,
			});
		});
	}
	return targets;
}

/** Your pace: the median of your recent levels (3+, passed, the latest attempt), in days. */
export function recentPaceDays(levelsStats: LevelsStats | null | undefined): number | null {
	if (!levelsStats) return null;
	const durations = Object.entries(levelsStats)
		.map(([level, entries]) => ({ level: Number(level), entry: entries?.[0] }))
		.filter(({ level, entry }) => level >= 3 && entry?.passed_at && !entry.abandoned_at)
		.sort((a, b) => b.level - a.level)
		.slice(0, RECENT_LEVELS)
		.map(({ entry }) => (Date.parse(entry.passed_at!) - Date.parse(entry.unlocked_at)) / DAY_MS)
		.filter(days => days > 0)
		.sort((a, b) => a - b);
	if (!durations.length) return null;
	const middle = Math.floor(durations.length / 2);
	return durations.length % 2 ? durations[middle] : (durations[middle - 1] + durations[middle]) / 2;
}

/* ------------------------------------------------------------------ */
/* The pace chosen (Levels page), also used by Home's calendar          */
/* ------------------------------------------------------------------ */

/** custom: a number of days a level of your own (Levels page only) */
export type ProjectionPace = 'yours' | 'fastest' | 'custom';
const PACE_KEY = 'projectionPace';
const CUSTOM_DAYS_KEY = 'projectionCustomDays';

export function readProjectionPace(): ProjectionPace {
	try {
		const saved = localStorage.getItem(PACE_KEY);
		return saved === 'fastest' || saved === 'custom' ? saved : 'yours';
	} catch {
		return 'yours';
	}
}

export function readCustomPaceDays(): number | null {
	try {
		const days = Number(localStorage.getItem(CUSTOM_DAYS_KEY));
		return Number.isFinite(days) && days > 0 ? days : null;
	} catch {
		return null;
	}
}

export function saveCustomPaceDays(days: number) {
	try {
		localStorage.setItem(CUSTOM_DAYS_KEY, String(days));
	} catch {
		// remembering it is optional
	}
}

export function saveProjectionPace(pace: ProjectionPace) {
	try {
		localStorage.setItem(PACE_KEY, pace);
	} catch {
		// remembering it is optional
	}
}

/** Days per level for a pace (yours: the fastest when there's no passed level yet). */
export function paceDaysFor(pace: ProjectionPace, levelsStats: LevelsStats | null | undefined): number {
	return (pace === 'yours' && recentPaceDays(levelsStats)) || FASTEST_LEVEL_DAYS;
}

export type ProjectionEvent = {
	time: number;
	kind: 'level' | 'target';
	/** a level up: the level reached */
	level?: number;
	/** short, for a calendar day: "N3", "Gr 5", "Lv 60 ✓" */
	label: string;
	title: string;
	pace: ProjectionPace;
};

/**
 * The projections as dated events, for a calendar: each level up, level 60 passed, and each JLPT
 * level / Jōyō grade not reached yet (when every subject is in memory). At the fastest pace the
 * next level up is left out: it's the fastest possible level up, marked on its own.
 */
export function projectionEvents({ subjects, complete, levelsStats, currentLevel, fastestLevelUp, pace, now = Date.now() }: {
	subjects: any[];
	complete: boolean;
	levelsStats: LevelsStats | null | undefined;
	currentLevel: number | null | undefined;
	fastestLevelUp: { level: number; at: number } | null | undefined;
	pace: ProjectionPace;
	now?: number;
}): ProjectionEvent[] {
	if (!currentLevel || !levelsStats) return [];
	const paceDays = paceDaysFor(pace, levelsStats);
	const latest = levelsStats[currentLevel]?.[0] ?? levelsStats[String(currentLevel)]?.[0];
	const options = {
		currentLevel,
		onLevelSince: latest?.unlocked_at ? Date.parse(latest.unlocked_at) : null,
		paceDays,
		fastestLevelUpAt: fastestLevelUp?.level === currentLevel ? fastestLevelUp.at : null,
		now,
	};
	const paceLabel = pace === 'yours' ? 'at your pace' : 'at the fastest pace';
	const events: ProjectionEvent[] = [];
	for (let level = currentLevel + (pace === 'fastest' ? 2 : 1); level <= 60; level++) {
		events.push({ time: etaForLevel(level, options), kind: 'level', level, label: `Lv ${level}`, title: `Level ${level} (projected, ${paceLabel})`, pace });
	}
	if (currentLevel <= 60) {
		events.push({ time: etaForLevel(61, options), kind: 'target', label: 'Lv 60 ✓', title: `Level 60 passed (projected, ${paceLabel})`, pace });
	}
	if (complete) {
		for (const target of projectionTargets(subjects)) {
			if (target.key === 'wk60' || !Number.isFinite(target.level) || target.level <= currentLevel) continue;
			const label = target.group === 'JLPT' ? target.label : target.label === 'All Jōyō' ? 'Jōyō' : target.label.replace('Grade ', 'Gr ');
			events.push({
				time: etaForLevel(target.level, options),
				kind: 'target',
				label,
				title: `${target.group === 'JLPT' ? 'JLPT ' : 'Jōyō '}${target.label === 'All Jōyō' ? 'all of it' : target.label}: 80% of its kanji and 70% of its words passed (projected, ${paceLabel})`,
				pace,
			});
		}
	}
	return events;
}

/**
 * When you'd be on `level`: what's left of the current level (the pace minus the time on it, at
 * least the fastest possible level up), then a pace per level.
 */
export function etaForLevel(
	level: number,
	{ currentLevel, onLevelSince, paceDays, fastestLevelUpAt, now = Date.now() }:
	{ currentLevel: number; onLevelSince: number | null; paceDays: number; fastestLevelUpAt: number | null; now?: number },
): number {
	if (level <= currentLevel) return now;
	const spent = onLevelSince ? now - onLevelSince : 0;
	const fastestLeft = fastestLevelUpAt ? Math.max(0, fastestLevelUpAt - now) : 0;
	const currentLeft = Math.max(paceDays * DAY_MS - spent, fastestLeft);
	return now + currentLeft + (level - currentLevel - 1) * paceDays * DAY_MS;
}
