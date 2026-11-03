<template>
	<div class="container features-page">
		<!-- what the extension can do, by where it happens -->
		<header class="features-hero">
			<h1>What it can do</h1>
			<p>A tour of the extension: on the pages you read, in this popup, and a few tips.</p>
			<input
				v-model.trim="query"
				type="search"
				class="features-search"
				placeholder="Find a feature (e.g. shortcut, history, notification)"
				aria-label="Find a feature"
			>
			<nav class="features-jump" aria-label="Sections">
				<button v-for="group in shownGroups" :key="group.id" type="button" @click="jump(group.id)">{{ group.title }}</button>
			</nav>
		</header>

		<p v-if="!shownGroups.length" class="features-empty">Nothing matches “{{ query }}”.</p>

		<section v-for="group in shownGroups" :id="group.id" :key="group.id" class="features-group">
			<h2>{{ group.title }}</h2>
			<article v-for="feature in group.features" :id="feature.id" :key="feature.id" class="feature-card">
				<span class="feature-icon" :style="{ '--feature-color': feature.color }" aria-hidden="true">
					<svg viewBox="0 0 24 24"><path :d="ICONS[feature.icon]" /></svg>
				</span>
				<div class="feature-body">
					<h3>{{ feature.title }}</h3>
					<!-- static texts written here (bold / italics only) -->
					<p v-for="(line, index) in feature.text" :key="index" v-html="line"></p>
					<div v-if="feature.keys" class="feature-keys">
						<div v-for="entry in feature.keys" :key="entry.keys.join('')" class="feature-key">
							<span class="feature-key-caps"><kbd v-for="key in entry.keys" :key="key">{{ key }}</kbd></span>
							<span>{{ entry.description }}</span>
						</div>
					</div>
					<div v-if="feature.actions" class="feature-actions">
						<RouterLink v-for="action in feature.actions" :key="action.label" :to="action.to" class="feature-action">
							{{ action.label }} ›
						</RouterLink>
					</div>
				</div>
			</article>
		</section>
	</div>
</template>

<script>
/** Simple line icons (24×24, stroked). */
const ICONS = {
	highlight: 'M4 20h16M7 16l9.5-9.5a2.1 2.1 0 0 0-3-3L4 13v3z',
	popup: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
	keyboard: 'M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M8 14h8',
	gauge: 'M12 14l4-4M4 18a9 9 0 1 1 16 0M12 5v2M5 12h2M17 12h2',
	search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM21 21l-5-5',
	sidepanel: 'M4 4h16v16H4zM14 4v16',
	tile: 'M5 5h14v14H5zM9 9h6M9 13h3',
	type: 'M4 7V5h16v2M12 5v14M9 19h6',
	practice: 'M5 4h10l4 4v12H5zM9 12l2 2 4-4',
	activity: 'M4 19V9M10 19V5M16 19v-7M22 19H2',
	friends: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 2.7-5 6-5s6 2 6 5M17 11a2.5 2.5 0 1 0 0-5M16 14c3 .2 5 2.2 5 5',
	trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8',
	bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
	home: 'M4 11l8-7 8 7M6 10v10h12V10',
	refresh: 'M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5',
	archive: 'M4 5h16v4H4zM6 9v10h12V9M10 13h4',
	moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
	warning: 'M12 3l10 18H2zM12 10v5M12 18v.01',
};

const GROUPS = [
	{
		id: 'on-pages',
		title: 'On web pages',
		features: [
			{
				id: 'highlighting',
				icon: 'highlight',
				color: '#00aaff',
				title: 'Highlighting',
				text: [
					'Kanji and words you study on WaniKani are highlighted on any page: <b>Kanji</b>, <b>Words</b>, or <b>Mixed</b> (words, and the kanji outside them).',
					'Color them by <b>learned / not learned</b>, <b>SRS stage</b>, <b>JLPT level</b> or <b>Jōyō grade</b>.',
					'Sites can be left out (or only some included) in Settings.',
				],
				actions: [{ label: 'Highlighting settings', to: { name: 'Settings', query: { tab: 'highlighting', section: 'highlighting' } } }],
			},
			{
				id: 'details-popup',
				icon: 'popup',
				color: '#e36f94',
				title: 'Subject details popup',
				text: [
					'Hover a highlight: a small preview opens in the bottom-right corner. Move onto it to open the full details: meanings, readings with pitch accent, mnemonics, stroke order, related subjects, your stats.',
					'Its <b>⋯</b> menu has <b>Lock subject</b> (hovering other words won\'t change it), <b>Keep open</b> (clicking outside won\'t close it) and <b>Key bindings</b>. Click the characters to copy them.',
				],
			},
			{
				id: 'shortcut-keys',
				icon: 'keyboard',
				color: '#7c6cf0',
				title: 'Shortcut keys',
				text: [
					'In the details popup (turn them off in its <b>⋯</b> menu, or in Settings). The ones marked * also work on a subject\'s page in this popup.',
				],
				keys: [
					{ keys: ['X'], description: 'Close the popup' },
					{ keys: ['O'], description: 'Expand the small preview' },
					{ keys: ['L'], description: 'Lock the subject' },
					{ keys: ['F'], description: 'Keep it open' },
					{ keys: ['B'], description: 'Back to the previous subject *' },
					{ keys: ['Y'], description: 'Copy the characters *' },
					{ keys: ['U'], description: 'Back to the top *' },
					{ keys: ['I', 'C', 'S', 'T'], description: 'Info, Cards, Statistics, Timestamps *' },
					{ keys: ['←', '→'], description: 'Previous / next section *' },
				],
			},
			{
				id: 'reading-level',
				icon: 'gauge',
				color: '#30a46c',
				title: 'Page reading level',
				text: [
					'A small bar in the corner of pages with Japanese: their <b>JLPT level</b> and how much of their kanji and words you know (<b>Easy</b> to <b>Hard</b>). Click it for the Learned, SRS, JLPT and Jōyō breakdowns.',
					'<b>Choose parts…</b> rates only parts of a site (an article\'s text, say), on all its pages. <b>Focus</b> then dims everything else.',
					'Keep a <b>history</b> of the pages you read, to sort and filter by difficulty. It stays in this browser, unless you back it up yourself.',
				],
				actions: [
					{ label: 'Pages read', to: { name: 'Pages' } },
					{ label: 'Settings', to: { name: 'Settings', query: { tab: 'reading', section: 'reading-bar' } } },
				],
			},
			{
				id: 'search-from-page',
				icon: 'search',
				color: '#f5a623',
				title: 'Search from a page',
				text: [
					'Select some text, right-click and pick <b>Search</b>: the search is waiting the next time you open the extension.',
					'With the popup popped out into its own window (the <b>Popout</b> button in the sidebar), just selecting text on a page searches it right away.',
				],
			},
			{
				id: 'side-panel',
				icon: 'sidepanel',
				color: '#5f7e8f',
				title: 'Details in the side panel',
				text: [
					'Prefer the details next to the page? Settings → Details → <b>Show subject details</b> → <i>Browser side panel</i>. Clicking a highlighted word then opens it there, and hovering updates it.',
				],
				actions: [{ label: 'Settings', to: { name: 'Settings', query: { tab: 'details', section: 'details-popup' } } }],
			},
		],
	},
	{
		id: 'in-popup',
		title: 'In the extension popup',
		features: [
			{
				id: 'subject-tiles',
				icon: 'tile',
				color: '#f100a1',
				title: 'Subject tiles',
				text: [
					'<b>Click</b> a tile to open the subject here. <b>Right-click</b> it to show it in the details popup of the page you\'re on.',
					'Lists have their own menu: color tiles by SRS stage, subject type or progress, sort, filter, show meanings.',
				],
			},
			{
				id: 'type-to-search',
				icon: 'type',
				color: '#00aaff',
				title: 'Type to search',
				text: [
					'On Home, just start typing: the search opens with what you typed. Search by meaning, reading (switch to kana input), characters or a level number.',
					'Curious about subjects WaniKani retired? Search <b>legacy</b> to list them all.',
				],
				actions: [
					{ label: 'Search', to: { name: 'Search' } },
					{ label: 'Legacy subjects', to: { name: 'Search', query: { q: 'legacy' } } },
				],
			},
			{
				id: 'practice',
				icon: 'practice',
				color: '#7c6cf0',
				title: 'Practice',
				text: [
					'The <b>▶</b> button on a list practices its subjects as flashcards: meaning and reading, at your own pace.',
				],
			},
			{
				id: 'daily-activity',
				icon: 'activity',
				color: '#30a46c',
				title: 'Today, and what you reviewed',
				text: [
					'Home shows today\'s reviews, accuracy, lessons and SRS moves, and a recap of yesterday. Open <b>reviews</b> to see the subjects you reviewed, as tiles or with their <b>SRS changes</b> (Apprentice IV → Guru I).',
				],
				actions: [{ label: 'Reviewed today', to: { name: 'Reviewed' } }],
			},
			{
				id: 'trouble-subjects',
				icon: 'warning',
				color: '#e0a020',
				title: 'Trouble subjects',
				text: [
					'The Apprentice subjects you keep getting wrong get a small <b>!</b> on their tiles (red for the worst), and a <b>Trouble</b> chip in their details. The <b>!</b> button on Home lists them (as tiles, or with their details: how often you get them right) and practices them.',
					'They leave the list on their own once you get them right a few times in a row. Turn the marks off in Settings → Popup.',
				],
				actions: [{ label: 'Trouble subjects', to: { name: 'Trouble' } }],
			},
			{
				id: 'friends',
				icon: 'friends',
				color: '#f5a623',
				title: 'Friends',
				text: [
					'Follow up to 15 WaniKani friends by username: their level, SRS progress and level-ups, from their public profiles.',
				],
				actions: [{ label: 'Friends', to: { name: 'Friends' } }],
			},
			{
				id: 'accolades',
				icon: 'trophy',
				color: '#c9a227',
				title: 'Accolades',
				text: [
					'Badges for levels, anniversaries, burned items, answers, speed runs, levels cleared, JLPT and Jōyō, and friends. Your level-ups get a small celebration.',
				],
				actions: [{ label: 'Accolades', to: { name: 'Accolades' } }],
			},
			{
				id: 'school-lists',
				icon: 'tile',
				color: '#3949ab',
				title: 'JLPT & Jōyō',
				text: [
					'Your progress through each <b>JLPT level</b> and <b>Jōyō grade</b>, for kanji on Home, and for kanji and WaniKani\'s words on their own page. Click a level for its subjects.',
				],
				actions: [{ label: 'JLPT & Jōyō', to: { name: 'School' } }],
			},
			{
				id: 'home-layout',
				icon: 'home',
				color: '#5f7e8f',
				title: 'Your Home',
				text: [
					'Reorder or hide Home\'s sections with <b>Customize home</b> at its bottom (or in Settings → Popup).',
				],
			},
		],
	},
	{
		id: 'notifications',
		title: 'Notifications',
		features: [
			{
				id: 'bell',
				icon: 'bell',
				color: '#e36f94',
				title: 'In the extension',
				text: [
					'The sidebar\'s bell keeps what happened: your level-ups and accolades, friends\' news, the daily summary.',
				],
				actions: [{ label: 'Notifications', to: { name: 'Notifications' } }],
			},
			{
				id: 'browser-notifications',
				icon: 'bell',
				color: '#00aaff',
				title: 'Browser notifications',
				text: [
					'<b>New reviews</b> ("20 more reviews") when a batch is available, and an optional <b>daily reminder</b> at the time you choose. Clicking one opens your reviews on WaniKani.',
				],
				actions: [{ label: 'Settings → General', to: { name: 'Settings', query: { tab: 'general', section: 'notifications' } } }],
			},
		],
	},
	{
		id: 'troubleshooting',
		title: 'Troubleshooting',
		features: [
			{
				id: 'no-notifications',
				icon: 'moon',
				color: '#8a8fa3',
				title: 'Notifications don\'t show up',
				text: [
					'Your system may be holding them back: <b>Do not disturb</b> or <b>Focus</b> (including the ones that turn on by themselves, e.g. in full screen or when sharing your screen), or the browser\'s notifications being off in the system\'s settings. They may still be in the notification centre.',
				],
			},
			{
				id: 'subjects-data',
				icon: 'refresh',
				color: '#e5484d',
				title: 'Something looks off',
				text: [
					'Wrong highlights, a subject that won\'t load, or something broken since updating to 2.0? <b>Reset subject data</b> at the bottom of Settings → Data removes what the previous version left behind and downloads your subjects from WaniKani again. Your settings and history are kept.',
				],
				actions: [{ label: 'Settings → Data', to: { name: 'Settings', query: { tab: 'data', section: 'storage' } } }],
			},
		],
	},
];

function plain(html) {
	return html.replace(/<[^>]+>/g, '');
}

export default {
	name: 'Features',

	data() {
		return { query: '', ICONS };
	},

	computed: {
		/** Groups with the features matching the search (all of them without one). */
		shownGroups() {
			const query = this.query.toLowerCase();
			if (!query) return GROUPS;
			return GROUPS
				.map(group => ({
					...group,
					features: group.features.filter(feature => [
						feature.title,
						...feature.text.map(plain),
						...(feature.keys ?? []).map(entry => entry.description),
					].some(text => text.toLowerCase().includes(query))),
				}))
				.filter(group => group.features.length);
		},
	},

	methods: {
		jump(id) {
			document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		},
	},
};
</script>

<style scoped>
/* the page sets its own spacing (no global heading / paragraph margins) */
.features-page h1,
.features-page h2,
.features-page h3,
.features-page p {
	margin: 0;
}

.features-page {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding-top: 12px;
	padding-bottom: 24px;
}

/* like Home's hero card */
.features-hero {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 16px;
	border-radius: var(--card-radius, 12px);
	border: 1px solid rgba(255, 255, 255, 0.06);
	background-color: var(--default-color);
	background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0));
	box-shadow: 0 4px 16px var(--shadow-soft-color);
	color: #fff;
}

.features-hero h1 {
	font-size: 19px;
	font-weight: 800;
}

.features-hero p {
	font-size: 12.5px;
	color: #c4c6da;
}

.features-search {
	margin-top: 4px;
	padding: 8px 12px;
	border: 1px solid rgba(255, 255, 255, 0.14);
	border-radius: 9px;
	background: rgba(255, 255, 255, 0.07);
	color: #fff;
	font-family: inherit;
	font-size: 12.5px;
}

.features-search::placeholder {
	color: #9a9db4;
}

.features-jump {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.features-jump button {
	padding: 4px 10px;
	border: 1px solid rgba(255, 255, 255, 0.14);
	border-radius: 999px;
	background: transparent;
	color: #e6e7f2;
	font-family: inherit;
	font-size: 11.5px;
	font-weight: 700;
	cursor: pointer;
	transition: background-color 0.15s;
}

.features-jump button:hover {
	background: rgba(255, 255, 255, 0.1);
}

.features-empty {
	padding: 24px;
	text-align: center;
	color: var(--font-sec-color);
	font-size: 13px;
}

.features-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
	scroll-margin-top: calc(var(--topbar-height) + 12px);
}

/* the group's name, as the other pages' section pills */
.features-group h2 {
	width: fit-content;
	margin-left: 2px;
	padding: 3px 10px;
	border-radius: 999px;
	background: var(--pill-color, #e36f94);
	color: #fff;
	font-size: 11.5px;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.feature-card {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 14px;
	border-radius: 12px;
	border: 1px solid var(--surface-border-color);
	background: var(--fill-color);
	box-shadow: 0 2px 10px var(--shadow-soft-color);
	scroll-margin-top: calc(var(--topbar-height) + 12px);
}

.feature-icon {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 10px;
	background: color-mix(in srgb, var(--feature-color) 16%, transparent);
}

.feature-icon svg {
	width: 19px;
	height: 19px;
	fill: none;
	stroke: var(--feature-color);
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.feature-body {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.feature-body h3 {
	font-size: 14px;
	font-weight: 800;
	color: var(--heading-color, #2a2d48);
}

.feature-body p {
	font-size: 12.5px;
	line-height: 1.55;
	color: var(--muted-color, var(--font-sec-color));
}

.feature-body p :deep(b) {
	color: var(--font-color);
}

.feature-keys {
	display: grid;
	grid-template-columns: 1fr;
	gap: 4px;
	margin-top: 2px;
}

.feature-key {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 5px 8px;
	border-radius: 8px;
	background: var(--surface-muted-color);
	font-size: 12px;
	color: var(--font-sec-color);
}

.feature-key-caps {
	flex-shrink: 0;
	display: flex;
	gap: 3px;
	min-width: 76px;
}

.feature-key kbd {
	min-width: 20px;
	padding: 2px 5px;
	box-sizing: border-box;
	border-radius: 5px;
	border: 1px solid var(--surface-border-color);
	border-bottom-width: 2px;
	background: var(--fill-color);
	font-family: inherit;
	font-size: 11px;
	font-weight: 800;
	text-align: center;
	color: var(--font-color);
}

.feature-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 2px;
}

.feature-action {
	padding: 4px 10px;
	border-radius: 7px;
	background: var(--surface-muted-color);
	color: var(--pill-color, #e36f94);
	font-size: 12px;
	font-weight: 700;
}

.feature-action:hover {
	opacity: 1;
	filter: brightness(1.05);
}
</style>
