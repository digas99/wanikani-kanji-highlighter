import { storage } from '#imports';
import bundledMaps from '@/utils/scripts/schoolKanjiMaps.json';

export type SchoolKey = 'jlpt' | 'joyo';
export type SchoolProgressColumn = 'burned' | 'passed' | 'progress' | 'locked';

export type SchoolKanjiMaps = {
	jlpt: Record<string, string[]>;
	joyo: Record<string, string[]>;
	/** the name kanji (Jinmeiyō): with the Jōyō ones, the kanji Japanese uses (missing in older caches) */
	jinmeiyo?: string[];
};

export type SchoolGradeStats = {
	grade: string;
	label: string;
	total: number;
	segments: Array<{
		column: SchoolProgressColumn;
		label: string;
		count: number;
		width: number;
		background: string;
		textColor: string;
	}>;
};

/** Locked share in progress bars: light gray (white vanished against white cards). */
export const LOCKED_SEGMENT_COLOR = '#e2e2ea';

const KANJIAPI_BASE = 'https://kanjiapi.dev/v1/kanji';
const CACHE_KEY = 'local:schoolKanjiMaps';
const CACHE_TIME_KEY = 'local:schoolKanjiMapsFetchedAt';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const JLPT_ENDPOINTS: Record<string, string> = {
	n5: 'jlpt-5',
	n4: 'jlpt-4',
	n3: 'jlpt-3',
	n2: 'jlpt-2',
	n1: 'jlpt-1',
};

/** grade-8 is Jōyō kanji excluding Kyōiku (school grades 1–6). */
const JOYO_ENDPOINTS: Record<string, string> = {
	g1: 'grade-1',
	g2: 'grade-2',
	g3: 'grade-3',
	g4: 'grade-4',
	g5: 'grade-5',
	g6: 'grade-6',
	g9: 'grade-8',
};

let maps: SchoolKanjiMaps = bundledMaps as SchoolKanjiMaps;
let loadPromise: Promise<SchoolKanjiMaps> | null = null;

export const SCHOOL_CONFIG: Record<SchoolKey, {
	title: string;
	description: string;
	grades: string[];
	gradeLabel: (grade: string) => string;
}> = {
	jlpt: {
		title: 'JLPT Kanji Progress',
		description: 'Kanji from the Japanese-Language Proficiency Test.',
		grades: ['n5', 'n4', 'n3', 'n2', 'n1'],
		gradeLabel: grade => grade.toUpperCase(),
	},
	joyo: {
		title: 'Jōyō Kanji Progress',
		description: 'Kanji from the official Jōyō list taught in Japanese schools.',
		grades: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g9'],
		gradeLabel: grade => `Gr ${grade.charAt(1)}`,
	},
};

export function getSchoolKanjiMapsSync(): SchoolKanjiMaps {
	return maps;
}

function isValidMaps(value: unknown): value is SchoolKanjiMaps {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as SchoolKanjiMaps;
	return Boolean(candidate.jlpt && candidate.joyo);
}

async function readCachedMaps(): Promise<{ maps: SchoolKanjiMaps; fetchedAt: number } | null> {
	const items = await storage.getItems([CACHE_KEY, CACHE_TIME_KEY]);
	const cachedMaps = items.find(item => item.key === CACHE_KEY)?.value;
	const fetchedAt = items.find(item => item.key === CACHE_TIME_KEY)?.value;

	if (!isValidMaps(cachedMaps) || typeof fetchedAt !== 'number') return null;
	return { maps: cachedMaps, fetchedAt };
}

async function writeCachedMaps(nextMaps: SchoolKanjiMaps) {
	await storage.setItems([
		{ key: CACHE_KEY, value: nextMaps },
		{ key: CACHE_TIME_KEY, value: Date.now() },
	]);
}

async function fetchKanjiList(path: string): Promise<string[]> {
	const response = await fetch(`${KANJIAPI_BASE}/${path}`, { cache: 'default' });
	if (!response.ok) {
		throw new Error(`kanjiapi.dev ${path}: HTTP ${response.status}`);
	}

	const data = await response.json();
	if (!Array.isArray(data) || !data.every(character => typeof character === 'string')) {
		throw new Error(`kanjiapi.dev ${path}: invalid payload`);
	}

	return data;
}

async function fetchMapsFromKanjiApi(): Promise<SchoolKanjiMaps> {
	const [jlptEntries, joyoEntries, jinmeiyo] = await Promise.all([
		Promise.all(Object.entries(JLPT_ENDPOINTS).map(async ([grade, path]) => [
			grade,
			await fetchKanjiList(path),
		] as const)),
		Promise.all(Object.entries(JOYO_ENDPOINTS).map(async ([grade, path]) => [
			grade,
			await fetchKanjiList(path),
		] as const)),
		fetchKanjiList('jinmeiyo'),
	]);

	return {
		jlpt: Object.fromEntries(jlptEntries),
		joyo: Object.fromEntries(joyoEntries),
		jinmeiyo,
	};
}

/**
 * Load JLPT/Jōyō kanji maps from extension storage or kanjiapi.dev.
 * Falls back to bundled v1.5 data when offline and no cache exists.
 */
export async function loadSchoolKanjiMaps(): Promise<SchoolKanjiMaps> {
	if (loadPromise) return loadPromise;

	loadPromise = (async () => {
		const cached = await readCachedMaps();
		// caches from before the Jinmeiyō list (pages' reading level) are fetched again once
		const cacheIsFresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS && Array.isArray(cached.maps.jinmeiyo);

		if (cacheIsFresh) {
			maps = cached.maps;
			return maps;
		}

		try {
			const remoteMaps = await fetchMapsFromKanjiApi();
			maps = remoteMaps;
			await writeCachedMaps(remoteMaps);
			return maps;
		} catch {
			if (cached) {
				maps = cached.maps;
				return maps;
			}
		}

		maps = bundledMaps as SchoolKanjiMaps;
		return maps;
	})();

	return loadPromise;
}

function formatSchoolField(school: SchoolKey, grade: string): string {
	return school === 'jlpt'
		? grade.toUpperCase()
		: `Grade ${grade.charAt(1)}`;
}

export function gradeDigit(value: string): string | null {
	return value.match(/(\d+)/)?.[1] ?? null;
}

export function subjectMatchesSchoolGrade(
	subject: { jlpt?: string; joyo?: string },
	school: SchoolKey,
	grade: string,
): boolean {
	const label = subject[school];
	if (!label) return false;
	return gradeDigit(label) === gradeDigit(grade);
}

export function enrichSubjectsWithSchoolGrades(
	subjects: Array<any>,
	sourceMaps: SchoolKanjiMaps = maps,
): Array<any> {
	const kanjiByChar = new Map<string, any>();
	for (const subject of subjects) {
		if (subject.type !== 'kanji' || !subject.characters) continue;
		kanjiByChar.set(subject.characters, subject);
	}

	for (const school of ['jlpt', 'joyo'] as SchoolKey[]) {
		for (const [grade, characters] of Object.entries(sourceMaps[school])) {
			for (const character of characters) {
				const subject = kanjiByChar.get(character);
				if (subject) subject[school] = formatSchoolField(school, grade);
			}
		}
	}

	return subjects;
}

export function enrichSubjectWithSchoolGrades(
	subject: any,
	sourceMaps: SchoolKanjiMaps = maps,
): any {
	if (!subject) return subject;
	enrichSubjectsWithSchoolGrades([subject], sourceMaps);
	return subject;
}

/** What a JLPT / Jōyō list is of: kanji, or WaniKani's words (vocabSchoolGrades.ts gives them grades). */
export type SchoolKind = 'kanji' | 'vocabulary';

const isKind = (subject: any, kind: SchoolKind) => (kind === 'kanji'
	? subject.type === 'kanji'
	: subject.type === 'vocabulary' || subject.type === 'kana_vocabulary');

export function getSchoolKanjiSubjects(subjects: Array<any>, school: SchoolKey, kind: SchoolKind = 'kanji'): Array<any> {
	return subjects.filter(subject =>
		isKind(subject, kind)
		&& !subject.assignment?.hidden
		&& Boolean(subject[school]),
	);
}

export function filterSchoolColumn(
	subjects: Array<any>,
	column: SchoolProgressColumn,
): Array<any> {
	switch (column) {
		case 'burned':
			return subjects.filter(subject => subject.assignment?.srs_stage === 9);
		case 'passed':
			return subjects.filter(subject =>
				subject.assignment?.passed_at && subject.assignment?.srs_stage !== 9,
			);
		case 'progress':
			return subjects.filter(subject =>
				!subject.assignment?.passed_at && (subject.assignment?.srs_stage ?? -1) > 0,
			);
		case 'locked':
			return subjects.filter(subject => {
				const stage = subject.assignment?.srs_stage;
				return stage == null || stage === -1;
			});
		default:
			return subjects;
	}
}

export function buildSubjectProgressSegments(
	subjects: Array<any>,
): SchoolGradeStats['segments'] {
	const total = subjects.length;

	const segments: SchoolGradeStats['segments'] = [
		{
			column: 'burned',
			label: 'Burned',
			count: filterSchoolColumn(subjects, 'burned').length,
			width: 0,
			background: 'var(--brn-color)',
			textColor: '#fff',
		},
		{
			column: 'passed',
			label: 'Passed',
			count: filterSchoolColumn(subjects, 'passed').length,
			width: 0,
			background: '#000000',
			textColor: '#fff',
		},
		{
			column: 'progress',
			label: 'Progress',
			count: filterSchoolColumn(subjects, 'progress').length,
			width: 0,
			background: 'var(--ap4-color)',
			textColor: '#fff',
		},
		{
			column: 'locked',
			label: 'Locked',
			count: filterSchoolColumn(subjects, 'locked').length,
			width: 0,
			background: LOCKED_SEGMENT_COLOR,
			textColor: '#000',
		},
	].map(segment => ({
		...segment,
		width: total ? (segment.count / total) * 100 : 0,
	}));

	return segments;
}

/* ------------------------------------------------------------------ */
/* Snapshot: last computed JLPT / Jōyō bars, shown instantly while the  */
/* full subject list (~9000 subjects) is still loading from IndexedDB.  */
/* ------------------------------------------------------------------ */

const SNAPSHOT_KEY_PREFIX = 'schoolProgressSnapshot:';

/** kanji keep the key they always had; words get their own */
const snapshotKey = (school: SchoolKey, kind: SchoolKind) => SNAPSHOT_KEY_PREFIX + school + (kind === 'vocabulary' ? ':vocabulary' : '');

export function readSchoolProgressSnapshot(school: SchoolKey, kind: SchoolKind = 'kanji'): SchoolGradeStats[] | null {
	try {
		const raw = localStorage.getItem(snapshotKey(school, kind));
		const rows = raw ? JSON.parse(raw) : null;
		return Array.isArray(rows) && rows.length ? rows : null;
	} catch {
		return null;
	}
}

export function writeSchoolProgressSnapshot(school: SchoolKey, rows: SchoolGradeStats[], kind: SchoolKind = 'kanji'): void {
	try {
		localStorage.setItem(snapshotKey(school, kind), JSON.stringify(rows));
	} catch {
		// the snapshot is only a speed-up
	}
}

export function hasSchoolProgressSnapshot(): boolean {
	return (['jlpt', 'joyo'] as SchoolKey[]).some(school => readSchoolProgressSnapshot(school) !== null);
}

/** Logout / clearing subject data: don't show the previous numbers. */
export function clearSchoolProgressSnapshots(): void {
	try {
		for (const school of ['jlpt', 'joyo'] as SchoolKey[]) {
			for (const kind of ['kanji', 'vocabulary'] as SchoolKind[]) localStorage.removeItem(snapshotKey(school, kind));
		}
	} catch {
		// ignore
	}
}

export function buildSchoolGradeStats(
	subjects: Array<any>,
	school: SchoolKey,
	grade: string,
	kind: SchoolKind = 'kanji',
): SchoolGradeStats {
	const config = SCHOOL_CONFIG[school];
	const gradeSubjects = getSchoolKanjiSubjects(subjects, school, kind)
		.filter(subject => subjectMatchesSchoolGrade(subject, school, grade));
	const total = gradeSubjects.length;
	const segments = buildSubjectProgressSegments(gradeSubjects);

	return {
		grade,
		label: config.gradeLabel(grade),
		total,
		segments,
	};
}

/* ------------------------------------------------------------------ */
/* JLPT readiness: an estimate from the kanji and words passed          */
/* ------------------------------------------------------------------ */

/**
 * Passed (burned too) of every level up to this one: the JLPT is cumulative (N3 covers N5–N3).
 * Words lower: WaniKani teaches many of the easy levels' words late (they lag behind by design).
 */
export const JLPT_READY_SHARE = { kanji: 0.8, words: 0.7 };

export type JlptReadinessLevel = {
	grade: string;
	/** "N3" */
	label: string;
	/** 0–1, of this level and the easier ones */
	kanji: number;
	words: number;
	ready: boolean;
};

export type JlptReadiness = {
	levels: JlptReadinessLevel[];
	/** the highest level ready for ("N4"), null: not N5 yet */
	ready: string | null;
	/** the next one to work on (null: all of them ready) */
	next: JlptReadinessLevel | null;
};

const passedOf = (row: SchoolGradeStats) => row.segments
	.filter(segment => segment.column === 'burned' || segment.column === 'passed')
	.reduce((sum, segment) => sum + segment.count, 0);

/**
 * From the JLPT rows (kanji and words, N5 first): for each level, the share of its kanji and
 * words passed, with the easier levels'. Ready for a level when both reach their
 * JLPT_READY_SHARE (and all the easier ones are). Only kanji and vocabulary (WaniKani's words):
 * not grammar, reading or listening.
 */
export function jlptReadiness(kanjiRows: SchoolGradeStats[], wordRows: SchoolGradeStats[]): JlptReadiness {
	return schoolReadiness('jlpt', kanjiRows, wordRows);
}

/** As jlptReadiness, for either list (Jōyō: the school grades, also taught cumulatively). */
export function schoolReadiness(school: SchoolKey, kanjiRows: SchoolGradeStats[], wordRows: SchoolGradeStats[]): JlptReadiness {
	const levels: JlptReadinessLevel[] = [];
	const totals = { kanji: [0, 0], words: [0, 0] };
	let stillReady = true;
	for (const grade of SCHOOL_CONFIG[school].grades) {
		const kanjiRow = kanjiRows.find(row => row.grade === grade);
		const wordRow = wordRows.find(row => row.grade === grade);
		if (kanjiRow) { totals.kanji[0] += passedOf(kanjiRow); totals.kanji[1] += kanjiRow.total; }
		if (wordRow) { totals.words[0] += passedOf(wordRow); totals.words[1] += wordRow.total; }
		const kanji = totals.kanji[1] ? totals.kanji[0] / totals.kanji[1] : 0;
		const words = totals.words[1] ? totals.words[0] / totals.words[1] : 0;
		stillReady = stillReady && kanji >= JLPT_READY_SHARE.kanji && words >= JLPT_READY_SHARE.words;
		levels.push({ grade, label: SCHOOL_CONFIG[school].gradeLabel(grade), kanji, words, ready: stillReady });
	}
	const readyLevels = levels.filter(level => level.ready);
	return {
		levels,
		ready: readyLevels.at(-1)?.label ?? null,
		next: levels.find(level => !level.ready) ?? null,
	};
}

/** The rows to estimate from: the live ones when every subject is in memory, else the saved ones. */
export function jlptRows(subjects: Array<any>, kind: SchoolKind, complete: boolean): SchoolGradeStats[] {
	return schoolRows(subjects, 'jlpt', kind, complete);
}

export function schoolRows(subjects: Array<any>, school: SchoolKey, kind: SchoolKind, complete: boolean): SchoolGradeStats[] {
	const saved = readSchoolProgressSnapshot(school, kind);
	if ((!complete && saved) || !subjects.length) return saved ?? [];
	return SCHOOL_CONFIG[school].grades.map(grade => buildSchoolGradeStats(subjects, school, grade, kind));
}

export function buildSchoolSections(
	subjects: Array<any>,
	school: SchoolKey,
	grade: string,
	kind: SchoolKind = 'kanji',
) {
	const gradeSubjects = getSchoolKanjiSubjects(subjects, school, kind)
		.filter(subject => subjectMatchesSchoolGrade(subject, school, grade));

	return ([
		{ column: 'burned' as SchoolProgressColumn, label: 'Burned', color: 'var(--brn-color)', srs: 9 },
		{ column: 'passed' as SchoolProgressColumn, label: 'Passed', color: '#000000', srs: 5 },
		{ column: 'progress' as SchoolProgressColumn, label: 'Progress', color: 'var(--ap4-color)', srs: 4 },
		{ column: 'locked' as SchoolProgressColumn, label: 'Locked', color: LOCKED_SEGMENT_COLOR, srs: -1 },
	]).map(({ column, label, color, srs }) => ({
		sectionId: `${school}-${grade}-${column}`,
		label,
		countLabel: `(${filterSchoolColumn(gradeSubjects, column).length})`,
		subjects: filterSchoolColumn(gradeSubjects, column),
		accentColor: color,
		headerVariant: 'compact',
		showControls: column === 'burned',
		srs,
	})).filter(section => section.subjects.length > 0);
}
