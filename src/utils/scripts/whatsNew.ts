/**
 * What changed from v1.5 to 2.0, in short: shown on the page that opens after the update
 * (entrypoints/upgrade) and on What's new in the popup (views/WhatsNew.vue).
 * `to`: where it lives in the popup (a route path, so the update's page can link to it as well).
 */

export const WHATS_NEW_VERSION = '2.0.0';

export type WhatsNewItem = {
	icon: keyof typeof WHATS_NEW_ICONS;
	title: string;
	text: string;
	to?: string;
	/** the link's label (default: "Open") */
	action?: string;
	/** about coming from v1 (not shown for a first install) */
	updateOnly?: boolean;
};

export type WhatsNewSection = {
	id: string;
	title: string;
	color: string;
	items: WhatsNewItem[];
};

/** Simple line icons (24×24, stroked). */
export const WHATS_NEW_ICONS = {
	highlight: 'M4 20h16M7 16l9.5-9.5a2.1 2.1 0 0 0-3-3L4 13v3z',
	globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.7 3.5 5.7 3.5 9s-1 6.3-3.5 9c-2.5-2.7-3.5-5.7-3.5-9s1-6.3 3.5-9z',
	palette:'M12 3a9 9 0 1 0 0 18c1.2 0 1.6-.9 1.2-1.8-.5-1 .2-2.2 1.3-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
	gauge: 'M12 14l4-4M4 18a9 9 0 1 1 16 0M12 5v2M5 12h2M17 12h2',
	quote: 'M5 7h5v5H7a2 2 0 0 0 2 2v2a4 4 0 0 1-4-4zM14 7h5v5h-3a2 2 0 0 0 2 2v2a4 4 0 0 1-4-4z',
	popup: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
	summary: 'M5 4h14v16H5zM8 9l2 2 4-4M8 15h8',
	review: 'M4 6h16v12H4zM8 10h8M8 14h5',
	home: 'M4 11l8-7 8 7M6 10v10h12V10',
	route: 'M5 19c0-4 4-4 7-7s7-3 7-7M5 19h.01M19 5h.01',
	activity: 'M4 19V9M10 19V5M16 19v-7M22 19H2',
	friends: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 2.7-5 6-5s6 2 6 5M17 11a2.5 2.5 0 1 0 0-5M16 14c3 .2 5 2.2 5 5',
	search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM21 21l-5-5',
	cloud: 'M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9zM12 11v5M10 14l2 2 2-2',
	bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
	key: 'M14 10a4 4 0 1 0-3.5 4L9 15.5V18H6.5v2H4v-2.5l5.5-5.5M15 9h.01',
};

export type WhatsNewHighlight = {
	id: 'words' | 'pages' | 'sentences' | 'summary';
	title: string;
	text: string;
	color: string;
	to?: string;
	action?: string;
};

/** The biggest changes: first, large, each with a small picture (WhatsNewList.vue draws them). */
export const WHATS_NEW_HIGHLIGHTS: WhatsNewHighlight[] = [
	{
		id: 'words',
		title: 'Words are highlighted too',
		text: 'Not only kanji: the words you study, even conjugated (話していました is found as 話す), and on pages with furigana.',
		color: '#a100f1',
		to: '/settings?tab=highlighting&section=highlighting',
		action: 'Highlighting settings',
	},
	{
		id: 'pages',
		title: 'Dynamic pages and translation',
		text: 'Dynamic pages like YouTube, are now highlighted as they change. Highlighted text no longer breaks the browser\'s translate tool: pages with highlights translate as they should.',
		color: '#e5484d',
	},
	{
		id: 'sentences',
		title: 'Example sentences from what you read',
		text: 'Sentences from the pages you browse show on each subject, with private on-device translation. Collect them and export them to Anki.',
		color: '#00aaff',
		to: '/pages/sentences',
		action: 'Sentences',
	},
	{
		id: 'summary',
		title: 'Review session summary',
		text: 'After your reviews on WaniKani: what went up, down or stayed, what you passed, trouble subjects and your level\'s progress.',
		color: '#30a46c',
		to: '/settings?tab=details&section=wanikani-reviews',
		action: 'Turn it on',
	},
];

export const WHATS_NEW: WhatsNewSection[] = [
	{
		id: 'pages',
		title: 'On the pages you read',
		color: '#00aaff',
		items: [
			{
				icon: 'palette',
				title: 'More ways to color',
				text: 'By learned or not, SRS stage, JLPT level or Jōyō grade.',
				to: '/settings?tab=highlighting&section=highlight-style',
				action: 'Highlighting settings',
			},
			{
				icon: 'gauge',
				title: 'Page reading level',
				text: 'A small bar shows a page\'s JLPT level and how much of it you know, with an optional history of the pages you read.',
				to: '/pages',
				action: 'Pages read',
			},
		],
	},
	{
		id: 'wanikani',
		title: 'On WaniKani',
		color: '#e36f94',
		items: [
			{
				icon: 'review',
				title: 'More during reviews',
				text: 'The subject\'s SRS stage, your accuracy and the last answer\'s SRS change. Optionally a context sentence and a session timer.',
				to: '/settings?tab=details&section=wanikani-reviews',
				action: 'Turn it on',
			},
		],
	},
	{
		id: 'popup',
		title: 'In the extension',
		color: '#a100f1',
		items: [
			{
				icon: 'home',
				title: 'A new Home',
				text: 'Today\'s reviews and accuracy, and a calendar of your activity that also looks ahead to reviews and level-ups.',
				to: '/',
				action: 'Home',
			},
			{
				icon: 'route',
				title: 'Plan ahead',
				text: 'What to review to level up and when, the workload of the coming days, and projections to level 60, JLPT and Jōyō.',
				to: '/levels',
				action: 'Levels',
			},
			{
				icon: 'activity',
				title: 'Know your reviews',
				text: 'What you reviewed each day and its SRS change, and the trouble subjects you keep missing, with flashcard practice.',
				to: '/reviewed',
				action: 'Reviewed today',
			},
			{
				icon: 'friends',
				title: 'Friends, accolades, notifications',
				text: 'Follow friends\' levels, earn badges, and get told when reviews are ready.',
				to: '/friends',
				action: 'Friends',
			},
			{
				icon: 'search',
				title: 'Faster search',
				text: 'Kana typing (CAPITALS for katakana) and quick filters.',
				to: '/search',
				action: 'Search',
			},
			{
				icon: 'cloud',
				title: 'Backups',
				text: 'Your settings and history, to a file or your Google Drive, if you want them.',
				to: '/settings?tab=data&section=backup',
				action: 'Backup settings',
			},
		],
	},
	{
		id: 'inside',
		title: 'Under the hood',
		color: '#30a46c',
		items: [
			{
				icon: 'bolt',
				title: 'Rebuilt from scratch',
				text: 'Faster, keeps your subjects on your computer and updates them in the background, with fewer calls to WaniKani.',
			},
			{
				icon: 'key',
				title: 'Nothing to set up again',
				updateOnly: true,
				text: 'Your settings and API key were carried over from the previous version.',
			},
		],
	},
];
