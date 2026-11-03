<template>
	<div class="container page-history">
		<!-- the sentences kept from these pages: a page of their own -->
		<PagesSectionSwitch v-if="historyOn || entries.length" active="pages" />
		<div v-if="historyOn || entries.length" class="page-history-toolbar">
			<div class="page-history-views" role="tablist" aria-label="Classification">
				<button
					v-for="option in PAGE_STATS_VIEWS"
					:key="option.id"
					type="button"
					role="tab"
					:aria-selected="view === option.id"
					:class="{ active: view === option.id }"
					@click="setView(option.id)"
				>{{ option.label }}</button>
			</div>
			<button v-if="entries.length" type="button" class="page-history-clear" @click="clear">Clear</button>
		</div>

		<!-- off: what it is, an example, and the switches right here -->
		<section v-if="!historyOn" class="page-history-intro">
			<h2>Page reading level</h2>
			<p>
				See how much of a page's kanji and words you already know, with its JLPT level, in the
				corner of pages with Japanese. Keep a list of what you read to find it again, sorted by
				difficulty.
			</p>
			<PageHistoryRow class="page-history-example" :entry="EXAMPLE" view="jlpt" when-label="10 min ago" />
			<button type="button" class="page-history-switch" role="switch" :aria-checked="barOn" @click="toggle('show_bar', !barOn)">
				<span>Show the bar on pages<small>A small bar in the corner of pages with Japanese</small></span>
				<span class="page-history-toggle" :class="{ on: barOn }"></span>
			</button>
			<button type="button" class="page-history-switch" role="switch" :aria-checked="false" @click="toggle('history', true)">
				<span>Keep a history<small>The pages you read, listed here</small></span>
				<span class="page-history-toggle"></span>
			</button>
			<p class="page-history-privacy">
				<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
				<span>
					The history stays in this browser, unless you back it up yourself. More options in
					<RouterLink :to="{ name: 'Settings', query: { tab: 'reading', section: 'pages-read' } }">Settings → Reading</RouterLink>.
				</span>
			</p>
		</section>
		<p v-else-if="!entries.length" class="page-history-note">
			Nothing yet: pages with Japanese you open from now on will show up here.
		</p>

		<!-- search, sort, filters -->
		<template v-if="entries.length">
			<div class="page-history-controls">
				<KanaSearchInput
					v-model="query"
					v-model:kana="kanaSearch"
					placeholder="Search titles and sites"
					kana-placeholder="にほん"
					aria-label="Search"
				/>
				<select v-model="sort" class="page-history-select" aria-label="Sort" @change="saveSort">
					<option v-for="option in SORTS" :key="option.id" :value="option.id">{{ option.label }}</option>
				</select>
			</div>
			<div class="page-history-filters">
				<!-- from a subject's details: only the pages with it -->
				<button
					v-if="hasSubject"
					type="button"
					class="page-history-chip on"
					title="Show every page"
					@click="clearHasSubject"
				><span lang="ja">{{ hasSubject.characters }}</span> <small>×</small></button>
				<!-- the classification badges of the chosen view -->
				<button
					v-for="label in badgeLabels"
					:key="label"
					type="button"
					class="page-history-chip"
					:class="{ on: badges.includes(label), empty: !badgeCounts[label] }"
					:disabled="!badgeCounts[label] && !badges.includes(label)"
					:aria-pressed="badges.includes(label)"
					@click="toggleBadge(label)"
				>{{ label }} <small>{{ badgeCounts[label] ?? 0 }}</small></button>
				<button
					v-if="partialCount"
					type="button"
					class="page-history-chip"
					:class="{ on: onlyPartial }"
					:aria-pressed="onlyPartial"
					title="Only the pages rated on chosen parts"
					@click="onlyPartial = !onlyPartial"
				>Part of page <small>{{ partialCount }}</small></button>
				<select v-if="sites.length > 1" v-model="site" class="page-history-select small" aria-label="Site">
					<option value="">All sites</option>
					<option v-for="entry in sites" :key="entry.host" :value="entry.host">{{ entry.host }} ({{ entry.count }})</option>
				</select>
			</div>
			<p class="page-history-count">
				<template v-if="filtering">{{ shown.length }} of {{ entries.length }} pages · <button type="button" class="page-history-reset" @click="resetFilters">Clear filters</button></template>
				<template v-else>{{ entries.length }} {{ entries.length === 1 ? 'page' : 'pages' }}</template>
			</p>
		</template>

		<PageHistoryRow
			v-for="entry in shown"
			:key="entry.url"
			:entry="entry"
			:view="view"
			:appearance="settings.appearance"
			:to="{ name: 'Page', query: { url: entry.url } }"
		/>
		<p v-if="entries.length && !shown.length" class="page-history-note">No pages match these filters.</p>
	</div>
</template>

<script>
import { useSettingsStore } from '@/stores/settings';
import PageHistoryRow from '@/components/PageStats/PageHistoryRow.vue';
import PagesSectionSwitch from '@/components/PageStats/PagesSectionSwitch.vue';
import KanaSearchInput from '@/components/KanaSearchInput.vue';
import { clearPageHistory, pageHasSubject, readPageHistory, watchPageHistory } from '@/utils/scripts/pageHistory';
import {
	difficultyScore,
	PAGE_STATS_VIEWS,
	pageBadge,
	resolvePageStatsView,
	viewBadgeLabels,
} from '@/utils/scripts/pageStats';

const SORTS = [
	{ id: 'recent', label: 'Last read' },
	{ id: 'hardest', label: 'Hardest first' },
	{ id: 'easiest', label: 'Easiest first' },
	{ id: 'kanji', label: 'Most kanji / words' },
	{ id: 'title', label: 'Title (A–Z)' },
];

const SORT_KEY = 'pageHistorySort';

/** The intro's example: a Wikipedia article, as it would show in the history. */
const EXAMPLE = {
	url: 'https://ja.wikipedia.org/wiki/日本',
	title: '日本 - Wikipedia',
	host: 'ja.wikipedia.org',
	at: 0,
	stats: {
		total: 1435,
		learned: '',
		notLearned: '',
		other: '',
		srs: {},
		jlpt: { n5: 75, n4: 154, n3: 315, n2: 270, n1: 514, none: 107 },
		joyo: {},
		learnedPercent: 42,
		level: 'N1',
	},
};

function savedSort() {
	try {
		const saved = localStorage.getItem(SORT_KEY);
		return SORTS.some(option => option.id === saved) ? saved : 'recent';
	} catch {
		return 'recent';
	}
}

export default {
	name: 'PageHistory',

	components: {
		PageHistoryRow,
		PagesSectionSwitch,
		KanaSearchInput,
	},

	data() {
		const settings = useSettingsStore();
		return {
			entries: [],
			view: resolvePageStatsView(settings.settings),
			query: '',
			/** romaji typed as hiragana (the search's あ) */
			kanaSearch: false,
			sort: savedSort(),
			/** the classification badges kept (none: all) */
			badges: [],
			site: '',
			onlyPartial: false,
			PAGE_STATS_VIEWS,
			SORTS,
			EXAMPLE,
		};
	},

	computed: {
		settings() {
			return useSettingsStore().settings;
		},
		historyOn() {
			return this.settings.page_stats?.history === true;
		},
		barOn() {
			return this.settings.page_stats?.show_bar === true;
		},
		/** each entry's badge in the chosen view (computed once per view) */
		badgeOf() {
			return new Map(this.entries.map(entry => [entry.url, pageBadge(entry.stats, this.view).text]));
		},
		badgeLabels() {
			return viewBadgeLabels(this.view);
		},
		badgeCounts() {
			const counts = {};
			for (const label of this.badgeOf.values()) counts[label] = (counts[label] ?? 0) + 1;
			return counts;
		},
		sites() {
			const counts = new Map();
			for (const entry of this.entries) counts.set(entry.host, (counts.get(entry.host) ?? 0) + 1);
			return [...counts].map(([host, count]) => ({ host, count })).sort((a, b) => b.count - a.count || a.host.localeCompare(b.host));
		},
		partialCount() {
			return this.entries.filter(entry => entry.stats.partial).length;
		},
		/** ?has=日本&type=vocabulary (a subject's "Seen on N pages"): the pages with it */
		hasSubject() {
			const { has, type } = this.$route.query;
			return typeof has === 'string' && has ? { characters: has, type: typeof type === 'string' ? type : 'kanji' } : null;
		},
		filtering() {
			return Boolean(this.query || this.badges.length || this.site || this.onlyPartial || this.hasSubject);
		},
		shown() {
			// hiragana mode: a trailing "n" waiting for its next key isn't searched for yet
			const query = this.query.trim().replace(this.kanaSearch ? /[a-z]+$/i : /$^/, '').toLowerCase();
			const filtered = this.entries.filter(entry =>
				(!this.hasSubject || pageHasSubject(entry, this.hasSubject))
				&& (!query || entry.title.toLowerCase().includes(query) || entry.host.toLowerCase().includes(query))
				&& (!this.badges.length || this.badges.includes(this.badgeOf.get(entry.url)))
				&& (!this.site || entry.host === this.site)
				&& (!this.onlyPartial || entry.stats.partial));
			const score = entry => difficultyScore(entry.stats, this.view);
			switch (this.sort) {
				case 'hardest': return [...filtered].sort((a, b) => score(b) - score(a));
				case 'easiest': return [...filtered].sort((a, b) => score(a) - score(b));
				case 'kanji': return [...filtered].sort((a, b) => b.stats.total - a.stats.total);
				case 'title': return [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'ja'));
				default: return [...filtered].sort((a, b) => b.at - a.at);
			}
		},
	},

	async created() {
		this.entries = await readPageHistory();
		this.unwatch = watchPageHistory(entries => { this.entries = entries; });
	},

	beforeUnmount() {
		this.unwatch?.();
	},

	methods: {
		/** another classification: its badges are other ones, so its filter starts empty */
		setView(view) {
			this.view = view;
			this.badges = [];
		},
		toggleBadge(label) {
			this.badges = this.badges.includes(label)
				? this.badges.filter(entry => entry !== label)
				: [...this.badges, label];
		},
		/** The intro's switches: the same settings as Settings → Page reading level. */
		toggle(key, value) {
			void useSettingsStore().setSetting('page_stats', key, value);
		},
		resetFilters() {
			this.query = '';
			this.badges = [];
			this.site = '';
			this.onlyPartial = false;
			this.clearHasSubject();
		},
		clearHasSubject() {
			if (!this.$route.query.has) return;
			const { has, type, ...query } = this.$route.query;
			this.$router.replace({ query });
		},
		saveSort() {
			try {
				localStorage.setItem(SORT_KEY, this.sort);
			} catch {
				// only remembers the choice
			}
		},
		async clear() {
			if (!window.confirm('Clear the list of pages read?')) return;
			await clearPageHistory();
		},
	},
};
</script>

<style scoped>
.page-history {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding-bottom: 20px;
	background-color: var(--default-color);
	color: #fff;
}

.page-history-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 4px 4px;
}

.page-history-views {
	display: flex;
	padding: 2px;
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.08);
}

.page-history-views button {
	padding: 4px 10px;
	border: none;
	border-radius: 6px;
	background: transparent;
	color: #c4c6da;
	font-family: inherit;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
}

.page-history-views button.active {
	background: rgba(255, 255, 255, 0.16);
	color: #fff;
}

.page-history-clear {
	padding: 4px 10px;
	border: 1px solid rgba(255, 255, 255, 0.18);
	border-radius: 6px;
	background: transparent;
	color: #c4c6da;
	font-family: inherit;
	font-size: 12px;
	cursor: pointer;
}

.page-history-controls {
	display: flex;
	gap: 6px;
	padding: 0 4px;
}

.page-history-search {
	flex: 1;
	min-width: 0;
	padding: 6px 10px;
	border: 1px solid rgba(255, 255, 255, 0.14);
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.06);
	color: #fff;
	font-family: inherit;
	font-size: 12.5px;
}

.page-history-search::placeholder {
	color: #9a9db4;
}

.page-history-select {
	padding: 5px 8px;
	border: 1px solid rgba(255, 255, 255, 0.14);
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.06);
	color: #fff;
	font-family: inherit;
	font-size: 12px;
}

.page-history-select option {
	color: #000;
}

.page-history-select.small {
	max-width: 150px;
	padding: 3px 6px;
	font-size: 11.5px;
}

.page-history-filters {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 5px;
	padding: 0 4px;
}

/* classification / part-of-page filters */
.page-history-chip {
	padding: 3px 9px;
	border: 1px solid rgba(255, 255, 255, 0.14);
	border-radius: 999px;
	background: transparent;
	color: #c4c6da;
	font-family: inherit;
	font-size: 11.5px;
	font-weight: 700;
	cursor: pointer;
	transition: background-color 0.15s, border-color 0.15s;
}

.page-history-chip small {
	margin-left: 2px;
	font-weight: 400;
	opacity: 0.75;
}

.page-history-chip:hover:not(:disabled) {
	background: rgba(255, 255, 255, 0.08);
}

.page-history-chip.on {
	border-color: #e36f94;
	background: rgba(227, 111, 148, 0.18);
	color: #fff;
}

.page-history-chip.empty {
	opacity: 0.4;
	cursor: default;
}

.page-history-count {
	padding: 2px 6px 0;
	font-size: 11px;
	color: #9a9db4;
}

.page-history-reset {
	padding: 0;
	border: none;
	background: transparent;
	color: #e36f94;
	font-family: inherit;
	font-size: 11px;
	font-weight: 700;
	cursor: pointer;
}

.page-history-intro {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 6px 4px 0;
	padding: 16px;
	border-radius: 12px;
	border: 1px solid rgba(255, 255, 255, 0.06);
	background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0));
}

.page-history-intro h2 {
	font-size: 17px;
	font-weight: 800;
}

.page-history-intro p {
	font-size: 12.5px;
	line-height: 1.5;
	color: #c4c6da;
}

.page-history-example {
	pointer-events: none;
}

.page-history-switch {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 8px 10px;
	border: 1px solid rgba(255, 255, 255, 0.06);
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.05);
	color: #fff;
	font-family: inherit;
	text-align: left;
	cursor: pointer;
}

.page-history-switch > span:first-child {
	display: flex;
	flex-direction: column;
	gap: 1px;
	font-size: 13px;
	font-weight: 700;
}

.page-history-switch small {
	font-size: 11px;
	font-weight: 400;
	color: #aeb1c6;
}

.page-history-toggle {
	position: relative;
	flex-shrink: 0;
	width: 34px;
	height: 19px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.2);
	transition: background-color 0.15s;
}

.page-history-toggle::after {
	content: '';
	position: absolute;
	top: 2px;
	left: 2px;
	width: 15px;
	height: 15px;
	border-radius: 50%;
	background: #fff;
	transition: transform 0.15s;
}

.page-history-toggle.on {
	background: #e36f94;
}

.page-history-toggle.on::after {
	transform: translateX(15px);
}

.page-history-privacy {
	display: flex;
	align-items: center;
	gap: 7px;
}

.page-history-privacy svg {
	flex-shrink: 0;
	width: 15px;
	height: 15px;
	fill: none;
	stroke: #5bd68f;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.page-history-privacy a {
	color: var(--wanikani-sec);
}

.page-history-note {
	padding: 24px 12px;
	text-align: center;
	font-size: 13px;
	color: #b3b6cc;
}

.page-history-note a {
	color: var(--wanikani-sec);
}
</style>
