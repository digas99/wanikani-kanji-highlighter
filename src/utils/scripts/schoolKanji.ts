import { storage } from '#imports';
import bundledMaps from '@/utils/scripts/schoolKanjiMaps.json';

export type SchoolKey = 'jlpt' | 'joyo';
export type SchoolProgressColumn = 'burned' | 'passed' | 'progress' | 'locked';

export type SchoolKanjiMaps = {
	jlpt: Record<string, string[]>;
	joyo: Record<string, string[]>;
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
	const [jlptEntries, joyoEntries] = await Promise.all([
		Promise.all(Object.entries(JLPT_ENDPOINTS).map(async ([grade, path]) => [
			grade,
			await fetchKanjiList(path),
		] as const)),
		Promise.all(Object.entries(JOYO_ENDPOINTS).map(async ([grade, path]) => [
			grade,
			await fetchKanjiList(path),
		] as const)),
	]);

	return {
		jlpt: Object.fromEntries(jlptEntries),
		joyo: Object.fromEntries(joyoEntries),
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
		const cacheIsFresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;

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

export function getSchoolKanjiSubjects(subjects: Array<any>, school: SchoolKey): Array<any> {
	return subjects.filter(subject =>
		subject.type === 'kanji'
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
			background: '#ffffff',
			textColor: '#000',
		},
	].map(segment => ({
		...segment,
		width: total ? (segment.count / total) * 100 : 0,
	}));

	return segments;
}

export function buildSchoolGradeStats(
	subjects: Array<any>,
	school: SchoolKey,
	grade: string,
): SchoolGradeStats {
	const config = SCHOOL_CONFIG[school];
	const gradeSubjects = getSchoolKanjiSubjects(subjects, school)
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

export function buildSchoolSections(
	subjects: Array<any>,
	school: SchoolKey,
	grade: string,
) {
	const gradeSubjects = getSchoolKanjiSubjects(subjects, school)
		.filter(subject => subjectMatchesSchoolGrade(subject, school, grade));

	return ([
		{ column: 'burned' as SchoolProgressColumn, label: 'Burned', color: 'var(--brn-color)', srs: 9 },
		{ column: 'passed' as SchoolProgressColumn, label: 'Passed', color: '#000000', srs: 5 },
		{ column: 'progress' as SchoolProgressColumn, label: 'Progress', color: 'var(--ap4-color)', srs: 4 },
		{ column: 'locked' as SchoolProgressColumn, label: 'Locked', color: '#ffffff', srs: -1 },
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
