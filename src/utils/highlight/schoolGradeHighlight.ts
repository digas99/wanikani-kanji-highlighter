import { SCHOOL_CONFIG, type SchoolKanjiMaps } from '@/utils/scripts/schoolKanji';

export type JlptGradeKey = 'n5' | 'n4' | 'n3' | 'n2' | 'n1';
export type JoyoGradeKey = 'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6' | 'g9';
export type SchoolGradeKey = JlptGradeKey | JoyoGradeKey;

export type SchoolGradeSection = {
	key: SchoolGradeKey;
	label: string;
	fallbackColor: string;
};

export const JLPT_GRADE_SECTIONS: SchoolGradeSection[] = [
	{ key: 'n5', label: 'N5', fallbackColor: '#43a047' },
	{ key: 'n4', label: 'N4', fallbackColor: '#7cb342' },
	{ key: 'n3', label: 'N3', fallbackColor: '#fbc02d' },
	{ key: 'n2', label: 'N2', fallbackColor: '#fb8c00' },
	{ key: 'n1', label: 'N1', fallbackColor: '#e53935' },
];

export const JOYO_GRADE_SECTIONS: SchoolGradeSection[] = [
	{ key: 'g1', label: 'Gr 1', fallbackColor: '#1e88e5' },
	{ key: 'g2', label: 'Gr 2', fallbackColor: '#3949ab' },
	{ key: 'g3', label: 'Gr 3', fallbackColor: '#5e35b1' },
	{ key: 'g4', label: 'Gr 4', fallbackColor: '#8e24aa' },
	{ key: 'g5', label: 'Gr 5', fallbackColor: '#d81b60' },
	{ key: 'g6', label: 'Gr 6', fallbackColor: '#f4511e' },
	{ key: 'g9', label: 'Gr 9', fallbackColor: '#6d4c41' },
];

export const JLPT_GRADE_KEYS = JLPT_GRADE_SECTIONS.map(section => section.key);
export const JOYO_GRADE_KEYS = JOYO_GRADE_SECTIONS.map(section => section.key);

export function createEmptyKanjiByJlpt(): Record<JlptGradeKey, string> {
	return Object.fromEntries(JLPT_GRADE_KEYS.map(key => [key, ''])) as Record<JlptGradeKey, string>;
}

export function createEmptyKanjiByJoyo(): Record<JoyoGradeKey, string> {
	return Object.fromEntries(JOYO_GRADE_KEYS.map(key => [key, ''])) as Record<JoyoGradeKey, string>;
}

export function buildKanjiByJlpt(maps: SchoolKanjiMaps): Record<JlptGradeKey, string> {
	const byGrade = createEmptyKanjiByJlpt();
	for (const grade of JLPT_GRADE_KEYS) {
		byGrade[grade] = (maps.jlpt[grade] ?? []).join('');
	}
	return byGrade;
}

export function buildKanjiByJoyo(maps: SchoolKanjiMaps): Record<JoyoGradeKey, string> {
	const byGrade = createEmptyKanjiByJoyo();
	for (const grade of JOYO_GRADE_KEYS) {
		byGrade[grade] = (maps.joyo[grade] ?? []).join('');
	}
	return byGrade;
}

export function buildSchoolGradeColorMap(
	sections: SchoolGradeSection[],
): Record<SchoolGradeKey, string> {
	return Object.fromEntries(
		sections.map(section => [section.key, section.fallbackColor]),
	) as Record<SchoolGradeKey, string>;
}

export function getSchoolGradeColor(
	gradeKey: SchoolGradeKey,
	sections: SchoolGradeSection[],
): string {
	return sections.find(section => section.key === gradeKey)?.fallbackColor ?? '#888888';
}

export function schoolGradeLabel(
	gradeKey: SchoolGradeKey,
	school: 'jlpt' | 'joyo',
): string {
	return SCHOOL_CONFIG[school].gradeLabel(gradeKey);
}

/** Build CSS rules coloring `[data-wkh-grade]` spans per JLPT/Jōyō grade. */
export function buildSchoolGradeCss(
	styleClass: string,
	sections: SchoolGradeSection[],
): string {
	const rules: string[] = [];

	for (const section of sections) {
		const color = section.fallbackColor;
		const selector = `.${styleClass}[data-wkh-grade="${section.key}"]`;

		if (styleClass.endsWith('_underlined')) {
			rules.push(`${selector} { border-bottom: 2px solid ${color} !important; color: inherit !important; background: transparent !important; }`);
		} else if (styleClass.endsWith('_bold')) {
			rules.push(`${selector} { color: ${color} !important; font-weight: bold !important; background: transparent !important; }`);
		} else if (styleClass.endsWith('_nostyle')) {
			rules.push(`${selector} { cursor: pointer; }`);
		} else {
			rules.push(`${selector} { background-color: ${color} !important; }`);
		}
	}

	return rules.join('\n');
}

export function gradeKeyFromSubject(
	subject: { jlpt?: string; joyo?: string },
	school: 'jlpt' | 'joyo',
): SchoolGradeKey | null {
	const label = subject[school];
	if (!label) return null;
	const digit = label.match(/(\d+)/)?.[1];
	if (!digit) return null;
	return school === 'jlpt'
		? (`n${digit}` as JlptGradeKey)
		: (`g${digit}` as JoyoGradeKey);
}
