import { createDefaultProfileMenus, createDefaultListMenus } from '@/utils/scripts/profileSubjects';
import type { LookupLink } from '@/utils/scripts/lookupLinks';
import { DEFAULT_HOME_ORDER } from '@/utils/scripts/homeLayout';

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
		/** Where subject details open: the in-page popup, or the browser's side panel. */
		location: 'page' as 'page' | 'sidepanel',
	},
	extension_icon: {
		kanji_counter: true,
		/**
		 * What the badge shows (utils/scripts/extensionBadge.ts, BadgeMode). Unset until chosen:
		 * then the counter's on / off decides (highlighted subjects, or nothing).
		 */
		badge: undefined as string | undefined,
	},
	/** Browser notifications (utils/scripts/reviewAlerts.ts). */
	notifications: {
		/** "20 more reviews" when the next batch is available */
		review_alerts: true,
		/** a reminder at daily_reminder_time ("HH:MM") when lessons / reviews are waiting */
		daily_reminder: false,
		daily_reminder_time: '19:00',
		searching_a_webpage_word: true,
	},
	/** How much of a page's kanji you know (utils/scripts/pageStats.ts): a bar on the page, and a history. */
	page_stats: {
		/** the bar in the page's corner */
		show_bar: false,
		/** keep a list of the pages read (only on this device) */
		history: false,
		/** with the history: a few sentences from each page, to study with (pageSentences.ts) */
		sentences: false,
		/** pages kept in the history (the oldest go; their sentences stay, archived) */
		history_size: 300,
		/** sentences kept from each page */
		sentences_per_page: 10,
		/** the classification shown (the bar while closed, the history): 'auto' follows the highlight's colors */
		view: 'auto' as 'auto' | 'learned' | 'srs' | 'jlpt' | 'joyo',
		/** focus (dimming all but the chosen parts) is for the page, or kept for the whole site */
		focus_memory: 'page' as 'page' | 'site',
	},
	/**
	 * WaniKani's reviews page: a panel with the subject's SRS stage, its review stats, JLPT /
	 * Jōyō, a context sentence and the last subject's SRS change; never anything that gives the
	 * answer away (utils/highlight/reviewInfo.ts).
	 */
	review_info: {
		enabled: false,
		/**
		 * under the characters: words, one of their context sentences (Japanese only, the word
		 * marked); kanji, a few words using it; radicals, a few kanji using them
		 */
		examples: true,
		/** words: the sentence instead of the word on its own (shown in the word's place) */
		sentence_replace: false,
	},
	/**
	 * WaniKani's reviews page: a countdown with its stats (utils/highlight/reviewTimer.ts). Pauses
	 * when the window loses focus or on a click, resumes on typing; at 0 it clicks Wrap Up.
	 */
	review_timer: {
		enabled: false,
		minutes: 25,
	},
	/**
	 * After WaniKani's reviews: a summary of the session on the next page (subjects, all right,
	 * which went up / down) (utils/highlight/reviewSummary.ts).
	 */
	review_summary: {
		enabled: false,
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
		/** paragraphs that read as Chinese (highlight/textLanguage.ts) */
		chinese_text: 'highlight' as 'highlight' | 'skip',
		/** text that could be Japanese or Chinese, on a page that doesn't tell (sites listed: the other way) */
		unclear_text: 'highlight' as 'highlight' | 'skip',
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
		/** How many "Recently viewed" subjects the search page remembers. */
		history_size: 100,
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
		// a locked subject you already know (knownSubjects.ts)
		known_color: '#14a39a',
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
		/** a mark on the subjects you keep getting wrong, and their list (troubleSubjects.ts) */
		trouble_marks: true,
	},
	levels: {
		dataSize: 10,
	},
	/** Popup Home page: section order and hidden sections (see utils/scripts/homeLayout.ts). */
	home: {
		order: [...DEFAULT_HOME_ORDER] as string[],
		hidden: [] as string[],
	},
	/** Custom "look this subject up on…" buttons in the subject details. */
	lookup: {
		// WaniKani and Jisho by default; removing them is saved (a stored list replaces this default)
		links: [
			{ id: 'wanikani', name: 'WaniKani', url: 'https://www.wanikani.com/search?query=%s', query: 'characters' },
			{ id: 'jisho', name: 'Jisho', url: 'https://jisho.org/search/%s', query: 'characters' },
		] as LookupLink[],
		/** WaniKani was added to lists saved before it was a default (see resolveLookupLinks) */
		wanikani_added: true,
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

/** Kanji and words alike (words: JLPT from Waller's lists, Jōyō from their hardest kanji). */
export const highlightColorByOptions = [
	{ label: 'Learned / Not learned', value: 'learned' },
	{ label: 'SRS stage', value: 'srs_stage' },
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

export const detailsLocationOptions = [
	{ label: 'On the page', value: 'page' },
	{ label: 'Browser side panel', value: 'sidepanel' },
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
): string {
	return highlightColorByOptions.find(option => option.value === colorBy)?.label ?? 'Learned / Not learned';
}

export function getHighlightModeLabel(
	target: 'kanji' | 'vocabulary' | 'mixed' | string = 'kanji',
	colorBy: 'learned' | 'srs_stage' | 'jlpt' | 'joyo' | string = 'learned',
): string {
	return `${getHighlightTargetLabel(target)} · ${getHighlightColorByLabel(colorBy)}`;
}
