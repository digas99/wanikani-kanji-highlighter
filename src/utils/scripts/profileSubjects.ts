import { srsStages, typeColors } from '@/utils/scripts/wanikani';

export type ProfileSectionKey = 'all' | 'radical' | 'kanji' | 'vocabulary';

export type ProfileMenuEntry = {
	opened: boolean;
	menu: {
		color_by: 'Subject Type' | 'Subject Progress' | 'SRS Stage';
		reviews_info: boolean;
		disabled_subjects: boolean;
	};
	filter: {
		srs_stage: string;
		state: string;
	};
	sort: {
		type: 'None' | 'SRS Stage' | 'Next Review';
		direction: 'Ascending' | 'Descending';
	};
};

export const PROFILE_SECTIONS = [
	{ key: 'all' as const, label: 'All', types: null },
	{ key: 'radical' as const, label: 'Radicals', types: ['radical'] },
	{ key: 'kanji' as const, label: 'Kanji', types: ['kanji'] },
	{ key: 'vocabulary' as const, label: 'Vocabulary', types: ['vocabulary', 'kana_vocabulary'] },
];

export function createDefaultProfileMenuEntry(): ProfileMenuEntry {
	return {
		opened: true,
		menu: {
			color_by: 'SRS Stage',
			reviews_info: true,
			disabled_subjects: true,
		},
		filter: {
			srs_stage: 'None',
			state: 'None',
		},
		sort: {
			type: 'SRS Stage',
			direction: 'Descending',
		},
	};
}

export function createDefaultProfileMenus(): Record<ProfileSectionKey, ProfileMenuEntry> {
	return {
		all: createDefaultProfileMenuEntry(),
		radical: createDefaultProfileMenuEntry(),
		kanji: createDefaultProfileMenuEntry(),
		vocabulary: createDefaultProfileMenuEntry(),
	};
}

export type ListMenuKey = 'lessons' | 'reviews' | 'search' | 'subjects' | 'highlighted';

export function createDefaultListMenus(): Record<ListMenuKey, ProfileMenuEntry> {
	return {
		lessons: createDefaultProfileMenuEntry(),
		reviews: createDefaultProfileMenuEntry(),
		search: createDefaultProfileMenuEntry(),
		subjects: createDefaultProfileMenuEntry(),
		highlighted: createDefaultProfileMenuEntry(),
	};
}

export function resolveTilesLayout(
	subjects: ProfileSubject[],
	layout: 'auto' | 'grid' | 'justify' = 'auto',
): 'grid' | 'justify' {
	if (layout === 'grid') return 'grid';
	if (layout === 'justify') return 'justify';
	return 'justify';
}

export type ProfileSubject = {
	id: number;
	type: string;
	level: number;
	characters?: string;
	character_images?: Array<{ content_type: string; url: string }>;
	meanings?: Array<{ meaning: string }>;
	readings?: Array<{ reading?: string; primary?: boolean }>;
	assignment: {
		srs_stage: number | null;
		passed_at?: string | null;
		available_at?: string | null;
		hidden?: boolean;
		hidden_at?: string | null;
	};
	isHidden: boolean;
	isLocked: boolean;
	srsKey: number;
};

function hexToRgb(hex: string) {
	const normalized = hex.replace('#', '');
	const value = normalized.length === 3
		? normalized.split('').map(char => char + char).join('')
		: normalized;
	const int = Number.parseInt(value, 16);
	return {
		r: (int >> 16) & 255,
		g: (int >> 8) & 255,
		b: int & 255,
	};
}

export function fontColorFromBackground(color: string): string {
	if (!color.startsWith('#')) return '#fff';
	const { r, g, b } = hexToRgb(color);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.62 ? '#000' : '#fff';
}

export function formatShortDuration(ms: number): string {
	if (ms <= 0) return 'now';
	const minutes = Math.floor(ms / 60000);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	return `${days}d`;
}

export function normalizeProfileSubject(subject: any): ProfileSubject {
	const assignment = subject.assignment || {};
	const srsStage = assignment.srs_stage ?? null;
	const passedAt = assignment.passed_at ?? null;
	const hidden = Boolean(assignment.hidden || assignment.hidden_at || subject.hidden_at);
	const isLocked = srsStage == null && !passedAt;

	return {
		id: subject.id,
		type: subject.type || subject.subject_type,
		level: subject.level,
		characters: subject.characters,
		character_images: subject.character_images,
		meanings: subject.meanings,
		readings: subject.readings,
		assignment: {
			srs_stage: srsStage,
			passed_at: passedAt,
			available_at: assignment.available_at ?? null,
			hidden,
			hidden_at: assignment.hidden_at ?? subject.hidden_at ?? null,
		},
		isHidden: hidden,
		isLocked,
		srsKey: isLocked ? -1 : Number(srsStage ?? -1),
	};
}

export function normalizeProfileSubjects(subjects: Array<any>): ProfileSubject[] {
	return subjects.map(normalizeProfileSubject);
}

export function subjectsForSection(
	subjects: ProfileSubject[],
	sectionKey: ProfileSectionKey,
): ProfileSubject[] {
	const section = PROFILE_SECTIONS.find(entry => entry.key === sectionKey);
	if (!section?.types) return subjects;
	return subjects.filter(subject => section.types?.includes(subject.type));
}

export function getSectionProgress(subjects: ProfileSubject[]) {
	const available = subjects.filter(subject => !subject.isHidden);
	const passed = available.filter(subject => subject.assignment.passed_at);
	const percent = available.length
		? (passed.length / available.length) * 100
		: 0;

	return {
		passed: passed.length,
		available: available.length,
		percent,
	};
}

export function filterProfileSubjects(
	subjects: ProfileSubject[],
	menu: ProfileMenuEntry,
): ProfileSubject[] {
	let result = [...subjects];

	if (!menu.menu.disabled_subjects) {
		result = result.filter(subject => !subject.isHidden);
	}

	if (menu.filter.srs_stage !== 'None') {
		result = result.filter(subject => {
			if (menu.filter.srs_stage === 'Locked') return subject.isLocked;
			const stageName = srsStages[subject.srsKey]?.name;
			return stageName === menu.filter.srs_stage;
		});
	}

	if (menu.filter.state !== 'None') {
		result = result.filter(subject => {
			const passed = Boolean(subject.assignment.passed_at);
			return menu.filter.state === 'Passed' ? passed : !passed;
		});
	}

	return result;
}

export function sortProfileSubjects(
	subjects: ProfileSubject[],
	menu: ProfileMenuEntry,
): ProfileSubject[] {
	if (menu.sort.type === 'None') return subjects;

	const direction = menu.sort.direction === 'Descending' ? -1 : 1;
	const sorted = [...subjects];

	if (menu.sort.type === 'SRS Stage') {
		sorted.sort((a, b) => direction * (a.srsKey - b.srsKey));
		return sorted;
	}

	const withReview = sorted
		.filter(subject => subject.assignment.available_at)
		.sort((a, b) => {
			const aTime = new Date(a.assignment.available_at!).getTime();
			const bTime = new Date(b.assignment.available_at!).getTime();
			return direction * (aTime - bTime);
		});

	const withoutReview = sorted.filter(subject => !subject.assignment.available_at);
	return [...withReview, ...withoutReview];
}

export function getTileStyle(
	subject: ProfileSubject,
	colorBy: ProfileMenuEntry['menu']['color_by'],
	appearance: Record<string, string>,
) {
	if (colorBy === 'Subject Progress') {
		if (subject.assignment.passed_at) {
			return {
				background: 'linear-gradient(to bottom, #ffd700, #daa520)',
				color: '#fff',
				invertCharacters: false,
				opacity: subject.isHidden ? 0.35 : 1,
			};
		}

		if (subject.isHidden) {
			return {
				backgroundColor: '#000',
				color: '#fff',
				invertCharacters: false,
				opacity: 0.35,
			};
		}

		return {
			backgroundColor: '#fff',
			color: '#000',
			invertCharacters: true,
			opacity: 1,
		};
	}

	if (colorBy === 'SRS Stage') {
		let background = '#fff';
		if (subject.isLocked) {
			background = '#fff';
		} else if (subject.srsKey >= 0) {
			const short = srsStages[subject.srsKey]?.short?.toLowerCase();
			background = appearance[`${short}_color`] || srsStages[subject.srsKey]?.color || '#fff';
		}

		return {
			backgroundColor: background,
			color: fontColorFromBackground(background),
			invertCharacters: background.toLowerCase() === '#ffffff' || background === '#fff',
			opacity: subject.isHidden ? 0.35 : 1,
		};
	}

	const type = subject.type as keyof typeof typeColors;
	const background = typeColors[type] || appearance.kanji_color;
	return {
		backgroundColor: background,
		color: fontColorFromBackground(background),
		invertCharacters: false,
		opacity: subject.isHidden ? 0.35 : 1,
	};
}

export function processProfileSubjects(
	subjects: ProfileSubject[],
	menu: ProfileMenuEntry,
): ProfileSubject[] {
	return sortProfileSubjects(filterProfileSubjects(subjects, menu), menu);
}

export function buildTileStyles(
	subjects: ProfileSubject[],
	menu: ProfileMenuEntry,
	appearance: Record<string, string>,
): Record<number, ReturnType<typeof getTileStyle>> {
	const colorBy = menu.menu.color_by;
	return Object.fromEntries(
		subjects.map(subject => [
			subject.id,
			getTileStyle(subject, colorBy, appearance),
		]),
	);
}

export const SORT_TYPE_OPTIONS = ['None', 'SRS Stage', 'Next Review'];
export const SORT_DIRECTION_OPTIONS = ['Ascending', 'Descending'];
export const FILTER_SRS_OPTIONS = ['None', 'Locked', ...Object.values(srsStages).map(stage => stage.name)];
export const FILTER_STATE_OPTIONS = ['None', 'Passed', 'Not Passed'];
export const COLOR_BY_OPTIONS = ['Subject Type', 'Subject Progress', 'SRS Stage'];
