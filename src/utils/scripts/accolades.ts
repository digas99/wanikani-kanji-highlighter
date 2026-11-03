import {
	SCHOOL_CONFIG,
	buildSchoolGradeStats,
	readSchoolProgressSnapshot,
	type SchoolGradeStats,
	type SchoolKey,
} from '@/utils/scripts/schoolKanji';
import type { LevelsStats } from '@/utils/scripts/levelStats';

export type AccoladeType =
	| 'level'
	| 'speed'
	| 'anniversary'
	| 'answers'
	| 'burned'
	| 'cleared'
	| 'jlpt'
	| 'joyo'
	| 'social';

export type AccoladeMilestone = {
	/** `${type}-${value}`: what's remembered as seen (milestones.ts) */
	id: string;
	value: number;
	title: string;
	/** what it takes, e.g. "Burn 1,000 items" */
	requirement: string;
	unlocked: boolean;
	image: string;
};

export type AccoladeGroup = {
	type: AccoladeType;
	title: string;
	description: string;
	color: string;
	milestones: AccoladeMilestone[];
	unlockedCount: number;
	/** Towards the next locked milestone; null when everything is unlocked (or unknown). */
	progress: { percentage: number; text: string } | null;
};

type Definition = {
	title: string;
	description: string;
	color: string;
	/** each one's badge: /images/accolades/<type>-<value>.png */
	milestones: Array<{ value: number; title: string; requirement: string }>;
};

const LEVEL_SECTIONS: Array<[number, string, string]> = [
	[10, '快', 'Pleasant'],
	[20, '苦', 'Painful'],
	[30, '死', 'Death'],
	[40, '地獄', 'Hell'],
	[50, '天国', 'Paradise'],
	[60, '現実', 'Reality'],
];

const DEFINITIONS: Record<AccoladeType, Definition> = {
	level: {
		title: 'Level',
		description: 'Reach each WaniKani level section',
		color: '#5f7e8f',
		milestones: LEVEL_SECTIONS.map(([value, kanji, name]) => ({
			value,
			title: `${kanji} ${name}`,
			requirement: `Reach level ${value}`,
		})),
	},
	speed: {
		title: 'Speed run',
		description: 'Pass a level quickly (from level 3 on: the first two are faster for everyone)',
		color: '#be852a',
		milestones: [14, 10, 8].map(value => ({
			value,
			title: `Under ${value} days`,
			requirement: `Pass a level in under ${value} days`,
		})),
	},
	anniversary: {
		title: 'Anniversary',
		description: 'Years since you started WaniKani',
		color: '#5e8e71',
		milestones: [1, 5, 10, 15].map(value => ({
			value,
			title: `${value} year${value > 1 ? 's' : ''}`,
			requirement: `Study for ${value} year${value > 1 ? 's' : ''}`,
		})),
	},
	answers: {
		title: 'Answers',
		description: 'Correct answers given in reviews (meaning and reading each count)',
		color: '#50768c',
		milestones: [10000, 50000, 100000, 250000, 500000].map(value => ({
			value,
			title: `${value / 1000}k answers`,
			requirement: `Answer ${value.toLocaleString()} questions correctly`,
		})),
	},
	burned: {
		title: 'Burned',
		description: 'Subjects burned',
		color: '#8f5f6b',
		milestones: [100, 500, 1000, 3500, 7000].map(value => ({
			value,
			title: `${value.toLocaleString()} items`,
			requirement: `Burn ${value.toLocaleString()} items`,
		})),
	},
	cleared: {
		title: 'Levels cleared',
		description: 'Levels with every item burned',
		color: '#924358',
		milestones: [1, 10, 30, 60].map(value => ({
			value,
			title: value === 60 ? 'All 60 levels' : `${value} level${value > 1 ? 's' : ''}`,
			requirement: value === 60 ? 'Burn every item of every level' : `Burn every item of ${value} level${value > 1 ? 's' : ''}`,
		})),
	},
	jlpt: {
		title: 'JLPT',
		description: 'Pass every WaniKani kanji of a JLPT level',
		color: '#715e8e',
		milestones: [5, 4, 3, 2, 1].map(value => ({
			value,
			title: `N${value}`,
			requirement: `Pass every N${value} kanji on WaniKani`,
		})),
	},
	joyo: {
		title: 'Jōyō',
		description: 'Pass every WaniKani kanji of a Jōyō school grade',
		color: '#8e6f5e',
		milestones: [1, 2, 3, 4, 5, 6, 9].map(value => ({
			value,
			title: value === 9 ? 'Middle School' : `Grade ${value}`,
			requirement: `Pass every ${value === 9 ? 'middle school' : `grade ${value}`} kanji on WaniKani`,
		})),
	},
	social: {
		title: 'Social',
		description: 'Friends added to compare with',
		color: '#659076',
		milestones: [1, 5, 15].map(value => ({
			value,
			title: value === 1 ? 'First friend' : value === 15 ? 'Full house' : `${value} friends`,
			requirement: value === 1 ? 'Add a friend' : `Add ${value} friends`,
		})),
	},
};

export const ACCOLADE_TYPES = Object.keys(DEFINITIONS) as AccoladeType[];

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function buildGroup(
	type: AccoladeType,
	isUnlocked: (value: number) => boolean,
	progressTowards: (value: number) => AccoladeGroup['progress'],
): AccoladeGroup {
	const definition = DEFINITIONS[type];
	const milestones = definition.milestones.map(({ value, title, requirement }) => ({
		id: `${type}-${value}`,
		value,
		title,
		requirement,
		unlocked: isUnlocked(value),
		image: `/images/accolades/${type}-${value}.png`,
	}));
	const next = milestones.find(milestone => !milestone.unlocked);

	return {
		type,
		title: definition.title,
		description: definition.description,
		color: definition.color,
		milestones,
		unlockedCount: milestones.filter(milestone => milestone.unlocked).length,
		progress: next ? progressTowards(next.value) : null,
	};
}

function progress(value: number, total: number, label: string): AccoladeGroup['progress'] {
	const percentage = total > 0 ? Math.min(100, (value / total) * 100) : 0;
	return { percentage, text: `${value.toLocaleString()} / ${total.toLocaleString()} ${label}` };
}

type GradeCounts = Record<number, { passed: number; total: number }>;

const SCHOOL_COUNTS_KEY_PREFIX = 'accoladesSchoolCounts:';

function readSavedCounts(school: SchoolKey): GradeCounts | null {
	try {
		const raw = localStorage.getItem(SCHOOL_COUNTS_KEY_PREFIX + school);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function saveCounts(school: SchoolKey, counts: GradeCounts): void {
	try {
		localStorage.setItem(SCHOOL_COUNTS_KEY_PREFIX + school, JSON.stringify(counts));
	} catch {
		// only used until the subjects are in memory again
	}
}

/** Each kind's last result, shown while its data loads (useAccolades). */
export const ACCOLADES_SNAPSHOT_KEY = 'accoladesSnapshot';

/** Logout / clearing subject data: don't show the previous badges. */
export function clearAccoladeSnapshots(): void {
	try {
		localStorage.removeItem(ACCOLADES_SNAPSHOT_KEY);
		for (const school of ['jlpt', 'joyo']) localStorage.removeItem(SCHOOL_COUNTS_KEY_PREFIX + school);
	} catch {
		// ignore
	}
}

function countsFromRows(rows: SchoolGradeStats[]): GradeCounts {
	const counts: GradeCounts = {};
	for (const row of rows) {
		const passed = row.segments
			.filter(segment => segment.column === 'burned' || segment.column === 'passed')
			.reduce((sum, segment) => sum + segment.count, 0);
		counts[Number(row.grade.replace(/\D/g, ''))] = { passed, total: row.total };
	}
	return counts;
}

/**
 * Kanji passed (burned included) out of the WaniKani kanji in each grade.
 * Only computed from the full subject list: a partial one (e.g. a single level
 * fetched before the rest load) would unlock or lock grades wrongly, so until
 * then the last full result is used.
 */
function schoolGradeCounts(subjects: Array<any>, subjectsComplete: boolean, school: SchoolKey): GradeCounts {
	if (subjectsComplete && subjects.length) {
		const counts = countsFromRows(
			SCHOOL_CONFIG[school].grades.map(grade => buildSchoolGradeStats(subjects, school, grade)),
		);
		saveCounts(school, counts);
		return counts;
	}
	const snapshot = readSchoolProgressSnapshot(school);
	return readSavedCounts(school) ?? (snapshot ? countsFromRows(snapshot) : {});
}

function schoolGroup(type: 'jlpt' | 'joyo', subjects: Array<any>, subjectsComplete: boolean): AccoladeGroup {
	const counts = schoolGradeCounts(subjects, subjectsComplete, type);
	const gradeName = (value: number) => DEFINITIONS[type].milestones.find(m => m.value === value)?.title ?? '';
	return buildGroup(
		type,
		value => {
			const grade = counts[value];
			return Boolean(grade && grade.total > 0 && grade.passed >= grade.total);
		},
		value => {
			const grade = counts[value];
			return grade ? progress(grade.passed, grade.total, `${gradeName(value)} kanji passed`) : null;
		},
	);
}

/** Fastest level passed (days), from level 3 on; null if none yet. */
function fastestLevelDays(levelsStats: LevelsStats | null | undefined): number | null {
	let best: number | null = null;
	for (const entries of Object.values(levelsStats ?? {})) {
		for (const entry of entries) {
			if (entry.level < 3 || !entry.passed_at || !entry.unlocked_at) continue;
			const days = (new Date(entry.passed_at).getTime() - new Date(entry.unlocked_at).getTime()) / DAY_MS;
			if (Number.isFinite(days) && days > 0 && (best == null || days < best)) best = days;
		}
	}
	return best;
}

/** Levels whose every (visible) subject is burned; null without the full subject list. */
function clearedLevels(assignments: Array<any>, subjects: Array<any>, subjectsComplete: boolean): number | null {
	if (!subjectsComplete || !subjects.length) return null;
	const burned = new Set(assignments.filter(assignment => assignment.srs_stage === 9).map(assignment => assignment.subject_id));
	const levels = new Map<number, boolean>();
	for (const subject of subjects) {
		if (subject.hidden_at || !subject.level) continue;
		levels.set(subject.level, (levels.get(subject.level) ?? true) && burned.has(subject.id));
	}
	return [...levels.values()].filter(Boolean).length;
}

export function computeAccolades({
	userInfo,
	assignments,
	subjects,
	subjectsComplete,
	levelsStats = null,
	correctAnswers = null,
	friendCount = 0,
	now = Date.now(),
}: {
	userInfo: any;
	assignments: Array<any>;
	subjects: Array<any>;
	/** Every cached subject is in memory (not just a level fetched on its own). */
	subjectsComplete: boolean;
	levelsStats?: LevelsStats | null;
	/** every correct review answer (dailyActivity); null while unknown */
	correctAnswers?: number | null;
	friendCount?: number;
	now?: number;
}): AccoladeGroup[] {
	const level = Number(userInfo?.level) || 0;
	const startedAt = userInfo?.started_at ? new Date(userInfo.started_at).getTime() : NaN;
	const yearsElapsed = Number.isFinite(startedAt) ? (now - startedAt) / YEAR_MS : 0;
	const burned = assignments.filter(assignment => !assignment.hidden && assignment.srs_stage === 9).length;
	const fastest = fastestLevelDays(levelsStats);
	const answers = correctAnswers ?? 0;
	const cleared = clearedLevels(assignments, subjects, subjectsComplete);

	return [
		buildGroup(
			'level',
			value => value <= level,
			value => progress(level, value, 'levels'),
		),
		buildGroup(
			'speed',
			value => fastest != null && fastest < value,
			value => fastest == null
				? null
				: { percentage: Math.min(100, (value / fastest) * 100), text: `Fastest level: ${fastest.toFixed(1)} days (goal: under ${value})` },
		),
		buildGroup(
			'anniversary',
			value => value <= Math.floor(yearsElapsed),
			value => progress(Math.round(yearsElapsed * 365.25), Math.round(value * 365.25), 'days'),
		),
		buildGroup(
			'answers',
			value => value <= answers,
			value => correctAnswers == null ? null : progress(answers, value, 'correct answers'),
		),
		buildGroup(
			'burned',
			value => value <= burned,
			value => progress(burned, value, 'burned'),
		),
		buildGroup(
			'cleared',
			value => cleared != null && value <= cleared,
			value => cleared == null ? null : progress(cleared, value, 'levels fully burned'),
		),
		schoolGroup('jlpt', subjects, subjectsComplete),
		schoolGroup('joyo', subjects, subjectsComplete),
		buildGroup(
			'social',
			value => value <= friendCount,
			value => progress(friendCount, value, value === 1 ? 'friend' : 'friends'),
		),
	];
}

export function countAccolades(groups: AccoladeGroup[]): { unlocked: number; total: number } {
	return groups.reduce(
		(sum, group) => ({
			unlocked: sum.unlocked + group.unlockedCount,
			total: sum.total + group.milestones.length,
		}),
		{ unlocked: 0, total: 0 },
	);
}
