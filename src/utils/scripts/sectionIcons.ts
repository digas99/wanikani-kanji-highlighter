import { SRS_STAGE_ICONS } from '@/assets/srsStageIcons';
import { JLPT_GRADE_SECTIONS, JOYO_GRADE_SECTIONS } from '@/utils/highlight/schoolGradeHighlight';
import { srsStages, typeColors } from './wanikani';

/**
 * The icon by a subject list's group title, from what the group is (its title). Two kinds, both
 * small rounded tiles: a drawing in a colour on white (WaniKani's SRS eggs, a lock, ✓ / ✗), or a
 * white mark on a colour (幺 字 語 for the subject types, 試 for JLPT, 学 for Jōyō, 新, 未, !).
 * No colour given: the section's accent (its coloured edge).
 */
export type SectionIcon =
	| { kind: 'svg'; viewBox: string; d: string; color?: string; evenodd?: boolean }
	| { kind: 'char'; char: string; color?: string };

const egg = (stage: number, color?: string): SectionIcon => ({ kind: 'svg', ...SRS_STAGE_ICONS[stage], color });
// these simple shapes cut their holes (the lock's) by the even-odd rule; WaniKani's eggs don't
const glyph = (d: string, color?: string): SectionIcon => ({ kind: 'svg', viewBox: '0 0 24 24', d, color, evenodd: true });

const LOCK = 'M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zm2 0h6V7a3 3 0 0 0-6 0z';
const CHECK = 'M9.5 16.2 5.3 12l-1.6 1.6 5.8 5.8L20.3 8.6l-1.6-1.6z';
const CROSS = 'M6.4 4.6 4.6 6.4 10.2 12l-5.6 5.6 1.8 1.8 5.6-5.6 5.6 5.6 1.8-1.8-5.6-5.6 5.6-5.6-1.8-1.8-5.6 5.6z';
const DASH = 'M5 10.8h14v2.4H5z';

const TYPE_ICONS: Record<string, { type: keyof typeof typeColors; char: string }> = {
	radical: { type: 'radical', char: '幺' },
	radicals: { type: 'radical', char: '幺' },
	kanji: { type: 'kanji', char: '字' },
	vocabulary: { type: 'vocabulary', char: '語' },
	kana_vocabulary: { type: 'vocabulary', char: '語' },
	words: { type: 'vocabulary', char: '語' },
};

/** Groups that aren't an SRS stage or a subject type, by their title. */
const OTHER_ICONS: Record<string, SectionIcon> = {
	// lessons not done yet / not unlocked
	initiate: { kind: 'char', char: '新', color: '#8a8fa3' },
	locked: glyph(LOCK, '#8a8fa3'),
	// level / JLPT / Jōyō lists, the activity's day: Guru and up, Apprentice, just started
	// passed: hatched (Guru II's open egg)
	passed: egg(6),
	progress: egg(4),
	'in progress': egg(4),
	started: egg(1),
	// a day's reviews
	'with mistakes': glyph(CROSS, '#e5484d'),
	'all correct': glyph(CHECK, '#30a46c'),
	'not scored': glyph(DASH, '#8a8fa3'),
	// the subjects you keep getting wrong (as the tiles' mark)
	'most trouble': { kind: 'char', char: '!!', color: '#e5484d' },
	trouble: { kind: 'char', char: '!', color: '#e0a020' },
	// highlighted on the page: in the highlight colours (the sections' accents)
	learned: glyph(CHECK),
	'not learned': { kind: 'char', char: '未' },
};

export function sectionIconFor(label: string): SectionIcon | null {
	const title = String(label ?? '').trim();
	for (const [stage, icon] of Object.entries(SRS_STAGE_ICONS)) {
		if (srsStages[Number(stage) as keyof typeof srsStages]?.name === title) return { kind: 'svg', ...icon };
	}
	// "Kanji", or "Level 7 · Vocabulary": its last part
	const type = TYPE_ICONS[title.split('·').pop()!.trim().toLowerCase()];
	if (type) return { kind: 'char', char: type.char, color: typeColors[type.type] };
	// JLPT "N3" (試: exam) and Jōyō "Gr 4" (学: school), in their level's colour
	const jlpt = JLPT_GRADE_SECTIONS.find(section => section.label === title);
	if (jlpt) return { kind: 'char', char: '試', color: jlpt.fallbackColor };
	const joyo = JOYO_GRADE_SECTIONS.find(section => section.label === title);
	if (joyo) return { kind: 'char', char: '学', color: joyo.fallbackColor };
	return OTHER_ICONS[title.toLowerCase()] ?? null;
}
