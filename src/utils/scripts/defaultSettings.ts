import { createDefaultProfileMenus, createDefaultListMenus } from '@/utils/scripts/profileSubjects';

export const WANIKANI_COLOR = '#f100a1';
export const WANIKANI_SEC_COLOR = '#00aaff';

export const defaultSettings = {
	kanji_details_popup: {
		activated: true,
		random_subject: 'Any',
		key_bindings: true,
		popup_opacity: 8,
		popup_width: 300,
		subject_drawing: true,
		audio_autoplay: false,
	},
	extension_icon: {
		kanji_counter: true,
	},
	notifications: {
		new_reviews: false,
		practice_reminder: false,
		practice_reminder_timestamp: '21:30',
		searching_a_webpage_word: true,
	},
	highlight_style: {
		learned: 'wkhighlighter_highlighted',
		not_learned: 'wkhighlighter_highlightedNotLearned',
	},
	highlighter: {
		enabled: true,
		mode: 'viewport' as 'full' | 'viewport',
		target: 'kanji' as 'kanji' | 'vocabulary' | 'mixed',
		color_by: 'learned' as 'learned' | 'srs_stage' | 'jlpt' | 'joyo',
		show_learned: true,
		show_not_learned: true,
		initial_choice_made: false,
		page_list_mode: 'blacklist' as 'blacklist' | 'whitelist',
	},
	search: {
		targeted_search: false,
		results_display: 'searchResultOptionlist',
		disabled_subjects: true,
		radicals: true,
		kanji: true,
		vocabulary: true,
		passed: true,
		locked: true,
		in_progress: true,
	},
	appearance: {
		highlight_learned: WANIKANI_SEC_COLOR,
		highlight_not_learned: WANIKANI_COLOR,
		details_popup: '#404040',
		radical_color: '#00a1f1',
		kanji_color: '#f100a1',
		vocab_color: '#a100f1',
		int_color: '#c1c0c1',
		ap1_color: '#cf72b0',
		ap2_color: '#d560ad',
		ap3_color: '#db44a9',
		ap4_color: '#dd0093',
		gr1_color: '#894e97',
		gr2_color: '#882d9e',
		mst_color: '#294ddb',
		enl_color: '#0093dd',
		brn_color: '#e20000',
	},
	miscellaneous: {
		time_in_12h_format: true,
		update_interval: 60,
		background_updates: true,
		sidebar_animation: true,
	},
	extension_popup_interface: {
		scripts_status: true,
		search_bar: true,
		highlighted_kanji: true,
		lessons_and_reviews: true,
		overall_progression_bar: true,
		overall_progression_stats: true,
		levels_in_progress: true,
		jlpt_kanji_progress: true,
		joyo_kanji_progress: true,
	},
	levels: {
		dataSize: 10,
	},
	profile_menus: createDefaultProfileMenus(),
	list_menus: createDefaultListMenus(),
};

export type SettingsState = typeof defaultSettings;
export type SettingsGroup = keyof SettingsState;

export const graysPattern = {
	highlight_learned: '#6B6B6B',
	highlight_not_learned: '#1E1E1E',
	details_popup: '#404040',
	radical_color: '#9E9E9E',
	kanji_color: '#757575',
	vocab_color: '#505050',
	ap1_color: '#C0C0C0',
	ap2_color: '#808080',
	ap3_color: '#6D6D6D',
	ap4_color: '#474747',
	gr1_color: '#708090',
	gr2_color: '#4c6073',
	mst_color: '#36454F',
	enl_color: '#2C3E50',
	brn_color: '#293133',
	int_color: '#B2BEB5',
};

export const flamingDurtlesPattern = {
	highlight_learned: WANIKANI_SEC_COLOR,
	highlight_not_learned: WANIKANI_COLOR,
	details_popup: '#404040',
	radical_color: '#65b6ae',
	kanji_color: '#e7e485',
	vocab_color: '#fc759b',
	ap1_color: '#7dc9fb',
	ap2_color: '#5db9fa',
	ap3_color: '#3da8f6',
	ap4_color: '#1d99f3',
	gr1_color: '#4edeac',
	gr2_color: '#1cdc9a',
	mst_color: '#c9ce3b',
	enl_color: '#f67400',
	brn_color: '#d53b49',
	int_color: '#c1c0c1',
};

export const highlightStyleOptions = {
	learned: [
		{ value: 'wkhighlighter_highlighted', title: 'Highlight', sampleClass: 'sample-highlighted' },
		{ value: 'wkhighlighter_highlighted_underlined', title: 'Underline', sampleClass: 'sample-underlined' },
		{ value: 'wkhighlighter_highlighted_bold', title: 'Bold', sampleClass: 'sample-bold' },
		{ value: 'wkhighlighter_highlighted_nostyle', title: 'No Style', sampleClass: 'sample-nostyle' },
	],
	not_learned: [
		{ value: 'wkhighlighter_highlightedNotLearned', title: 'Highlight', sampleClass: 'sample-highlighted' },
		{ value: 'wkhighlighter_highlightedNotLearned_underlined', title: 'Underline', sampleClass: 'sample-underlined' },
		{ value: 'wkhighlighter_highlightedNotLearned_bold', title: 'Bold', sampleClass: 'sample-bold' },
		{ value: 'wkhighlighter_highlightedNotLearned_nostyle', title: 'No Style', sampleClass: 'sample-nostyle' },
	],
};

export const highlightModeOptions = [
	{ label: 'Whole page', value: 'full' },
	{ label: 'As you scroll', value: 'viewport' },
];

export const highlightTargetOptions = [
	{ label: 'Kanji', value: 'kanji' },
	{ label: 'Words', value: 'vocabulary' },
	{ label: 'Mixed', value: 'mixed' },
];

export const highlightColorByOptions = [
	{ label: 'Learned / Not learned', value: 'learned' },
	{ label: 'SRS stage', value: 'srs_stage' },
];

/** Kanji-only color modes (JLPT / Jōyō grade lists). */
export const highlightColorByKanjiOptions = [
	{ label: 'JLPT level', value: 'jlpt' },
	{ label: 'Jōyō grade', value: 'joyo' },
];

export const randomSubjectOptions = [
	'Any',
	'Radicals',
	'Kanji',
	'Vocabulary',
	'Learned',
	'Not Learned',
	'Lessons',
	'Reviews',
];

export const popupWidthOptions = [
	{ label: 'Wide', value: 350 },
	{ label: 'Moderate', value: 300 },
	{ label: 'Narrow', value: 270 },
];

export function getHighlightTargetLabel(
	target: 'kanji' | 'vocabulary' | 'mixed' | string = 'kanji',
): string {
	return highlightTargetOptions.find(option => option.value === target)?.label ?? 'Kanji';
}

export function getHighlightColorByLabel(
	colorBy: 'learned' | 'srs_stage' | 'jlpt' | 'joyo' | string = 'learned',
	target: 'kanji' | 'vocabulary' | 'mixed' | string = 'kanji',
): string {
	const options = target === 'kanji'
		? [...highlightColorByOptions, ...highlightColorByKanjiOptions]
		: highlightColorByOptions;
	return options.find(option => option.value === colorBy)?.label ?? 'Learned / Not learned';
}

export function getHighlightModeLabel(
	target: 'kanji' | 'vocabulary' | 'mixed' | string = 'kanji',
	colorBy: 'learned' | 'srs_stage' | 'jlpt' | 'joyo' | string = 'learned',
): string {
	return `${getHighlightTargetLabel(target)} · ${getHighlightColorByLabel(colorBy, target)}`;
}
