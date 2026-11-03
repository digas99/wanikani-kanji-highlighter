<template>
	<div class="container">
		<div class="searchArea">
			<div class="searchMenu">
				<!-- the same field as Pages read / Sentences: A / あ (romaji typed as hiragana) inside -->
				<KanaSearchInput
					id="kanjiSearchInput"
					ref="kanjiSearchInput"
					class="search-field"
					:model-value="searchQuery"
					:kana="searchTypeKana"
					placeholder="Gold / 金 / 5"
					kana-placeholder="きん"
					aria-label="Search subjects"
					@update:model-value="onQuery"
					@update:kana="onKanaChange"
					@focus="searchInputHasFocus = true"
					@blur="searchInputHasFocus = false"
				/>
				<div id="searchResultNavbar">
					<div class="searchResultNavbarOptionsWrapper" style="display: flex;">
						<div id="nmrKanjiFound"><span>{{ nResults }}<span></span></span></div>
						<div class="searchOptionSeparator"></div>
						<div class="search-display-modes" role="radiogroup" aria-label="Results layout">
							<button
								v-for="mode in displayModes"
								:key="mode.key"
								type="button"
								role="radio"
								class="search-display-mode"
								:class="{ active: resultDisplay === mode.key }"
								:aria-checked="resultDisplay === mode.key"
								:title="mode.label"
								@click="setResultDisplay(mode.key)"
							>
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<template v-if="mode.key === 'list'">
										<rect x="3" y="4" width="18" height="7" rx="2" />
										<rect x="3" y="13" width="18" height="7" rx="2" />
									</template>
									<template v-else-if="mode.key === 'compact'">
										<rect x="3" y="3.5" width="18" height="3" rx="1" />
										<rect x="3" y="8.5" width="18" height="3" rx="1" />
										<rect x="3" y="13.5" width="18" height="3" rx="1" />
										<rect x="3" y="18.5" width="18" height="3" rx="1" />
									</template>
									<template v-else>
										<rect x="3" y="3" width="5" height="5" rx="1" />
										<rect x="9.5" y="3" width="5" height="5" rx="1" />
										<rect x="16" y="3" width="5" height="5" rx="1" />
										<rect x="3" y="9.5" width="5" height="5" rx="1" />
										<rect x="9.5" y="9.5" width="5" height="5" rx="1" />
										<rect x="16" y="9.5" width="5" height="5" rx="1" />
										<rect x="3" y="16" width="5" height="5" rx="1" />
										<rect x="9.5" y="16" width="5" height="5" rx="1" />
										<rect x="16" y="16" width="5" height="5" rx="1" />
									</template>
								</svg>
							</button>
						</div>
					</div>
				</div>
				<!-- the filters, always in view (no menu to open) -->
				<SearchMenu class="search-filters-row" @filter-change="onSearchFiltersChanged" />
			</div>
			<div class="searchResults">
				<div v-if="nResults > 0">
					<!-- Tiles View -->
					<SubjectsList
						v-if="resultDisplay === 'grid'"
						:values="results"
						type="srs"
						:colors="colors"
						:show-title="false"
						:height="415"
						menu-key="search"
					/>

					<!-- Detailed View -->
					<ul v-else class="searchResultItemWrapper">
						<SearchResultItem v-for="item in results" :key="item.id" :item="item" :compact="resultDisplay === 'compact'" @search="search" />
					</ul>
				</div>
				<div v-else-if="!searchQuery.trim() && historySubjects.length" class="search-history">
					<div class="search-history-header">
						<span class="search-history-title">Recently viewed</span>
						<div class="search-history-actions">
							<!-- the filters hide some: how many of them are shown -->
							<span
								class="search-history-count"
								:title="shownHistory.length < historySubjects.length ? 'Some are hidden by the filters above' : null"
							>{{ shownHistory.length < historySubjects.length ? `${shownHistory.length} / ${historySubjects.length}` : historySubjects.length }}</span>
							<button
								type="button"
								class="search-history-clear clickable"
								title="Clear recently viewed subjects"
								@click="clearHistory"
							>
								Clear
							</button>
						</div>
					</div>
					<p v-if="!shownHistory.length" class="search-history-hidden">All hidden by the filters above.</p>
					<SubjectsList
						v-else-if="resultDisplay === 'grid'"
						:values="shownHistory"
						type="srs"
						:colors="colors"
						:show-title="false"
						:show-progression-bar="false"
						:height="415"
						menu-key="search"
					/>
					<ul v-else class="searchResultItemWrapper">
						<SearchResultItem
							v-for="item in shownHistory"
							:key="item.id"
							:item="item"
							:compact="resultDisplay === 'compact'"
							@search="search"
						/>
					</ul>
				</div>
				<div v-else class="no-results">
					<span>金</span>
					<span>{{ searchQuery.trim() ? 'No results found' : 'Search for kanji, readings, meanings, or levels' }}</span>
				</div>
			</div>
		</div>
	</div>

</template>

<script>
import { useWKStore } from '@/stores';
import { useMagicKeys, whenever } from '@vueuse/core'

import { isHiragana, isKatakana, toHiragana } from 'wanakana';

import SearchMenu from '@/components/Search/SearchMenu.vue';
import KanaSearchInput from '@/components/KanaSearchInput.vue';
import SubjectsList from '@/components/Subjects/SubjectsList.vue';
import SearchResultItem from '@/components/Search/SearchResultItem.vue';

import { useSettingsStore } from '@/stores/settings';
import { typeColors } from '@/utils/scripts/wanikani';
import { filterSearchResults } from '@/utils/scripts/searchFilters';
import { clearSearchHistory, getSearchHistoryIds } from '@/utils/scripts/searchHistory';
import { enrichWithSchoolGrades as enrichSubjectsWithSchoolGrades } from '@/utils/scripts/vocabSchoolGrades';


/** Layout → saved setting value (the older values are kept, so saved choices still apply). */
const RESULT_DISPLAY_SETTINGS = {
	list: 'searchResultOptionlist',
	compact: 'searchResultOptioncompact',
	grid: 'searchResultOptionbig-grid',
};

/**
 * The word itself first, then subjects read exactly like the query, then the rest (each
 * group keeping its order): "もう" lists もう, then 毛, 申… (read もう), then 申す, 羊毛…
 */
function rankExactMatchesFirst(subjects, query) {
	const target = toHiragana(query);
	const tiers = [[], [], []];
	for (const subject of subjects) {
		if (toHiragana(subject.characters ?? '') === target) tiers[0].push(subject);
		else if ((subject.readings ?? []).some(reading => toHiragana(reading.reading ?? '') === target)) tiers[1].push(subject);
		else tiers[2].push(subject);
	}
	return tiers.flat();
}

const DISPLAY_MODES = [
	{ key: 'list', label: 'Detailed list' },
	{ key: 'compact', label: 'Compact list (more results at once)' },
	{ key: 'grid', label: 'Tiles' },
];

export default {
	name: 'Search',
	components: {
		SearchMenu,
		SubjectsList,
		SearchResultItem,
		KanaSearchInput,
	},
	data() {
		return {
			wkManager: null,
			searchSeq: 0,
			/** 'list' (detailed cards, default) · 'compact' (slim rows) · 'grid' (tiles) */
			resultDisplay: 'list',
			rawResults: [],
			searchInput: null,
			searchInputHasFocus: false,
			searchQuery: '',
			searchTypeKana: false,
			results: [],
			nResults: 0,
			historySubjects: [],
			colors: {},
		};
	},

	setup() {
		const { current } = useMagicKeys()
		const searchQuery = ref('');
		const searchInput = ref(null);
		const searchInputHasFocus = ref(false);

		// trigger search when a a-z key is pressed
		whenever(current, (keys) => {
			const input = searchInput.value;
			for (const key of keys) {
				if (key.length === 1 && key.match(/[a-z]/i)) {
					if (!searchInputHasFocus.value) {
						input.focus();
					}
					break;
				}
			}
		});

		return { searchQuery, searchInput, searchInputHasFocus };
	},

	computed: {
		wk() {
			return useWKStore();
		},
		displayModes() {
			return DISPLAY_MODES;
		},
		settingsStore() {
			return useSettingsStore();
		},
		searchFilterOptions() {
			const search = this.settingsStore.settings.search;
			return {
				disabled_subjects: search.disabled_subjects,
				radicals: search.radicals,
				kanji: search.kanji,
				vocabulary: search.vocabulary,
				passed: search.passed,
				in_progress: search.in_progress,
				locked: search.locked,
			};
		},
		typeColors() {
			return typeColors;
		},
		/** Recently viewed, through the same filters as the results. */
		shownHistory() {
			return filterSearchResults(this.historySubjects, this.searchFilterOptions);
		},
	},

	created() {
		this.wkManager = this.wk.manager;
		this.colors = this.typeColors;
		const savedDisplay = Object.entries(RESULT_DISPLAY_SETTINGS)
			.find(([, value]) => value === this.settingsStore.settings.search.results_display);
		this.resultDisplay = savedDisplay?.[0] ?? 'list';
	},

	mounted() {
		const query = this.$route.query.q;
		if (query) {
			this.searchQuery = query;
			this.search();
		}

		// opened in hiragana mode (the link it came from, or going back to it)
		if (this.$route.query.type === 'kana') this.searchTypeKana = true;

		this.searchInput = this.$refs.kanjiSearchInput;
		this.$refs.kanjiSearchInput.focus();
		void this.loadSearchHistory();
	},

	activated() {
		void this.loadSearchHistory();
	},

	methods: {
		applySearchFilters() {
			// "legacy" asks for the retired subjects: the "Disabled subjects" filter doesn't hide them then
			const options = this.isLegacyQuery(this.searchQuery)
				? { ...this.searchFilterOptions, disabled_subjects: true }
				: this.searchFilterOptions;
			this.results = filterSearchResults(this.rawResults, options);
			this.nResults = this.results.length;
		},
		onSearchFiltersChanged(key) {
			if (key === 'targeted_search') {
				if (this.searchQuery.trim()) this.search();
				return;
			}
			this.applySearchFilters();
		},
		async setResultDisplay(mode) {
			if (this.resultDisplay === mode) return;
			this.resultDisplay = mode;
			await this.settingsStore.setSetting('search', 'results_display', RESULT_DISPLAY_SETTINGS[mode]);
		},
		async loadSearchHistory() {
			const ids = await getSearchHistoryIds();
			if (!ids.length || !this.wkManager) {
				this.historySubjects = [];
				return;
			}

			// One cache read for the whole list (no per-item review-stats requests).
			const subjects = await this.wkManager.readSubjectsById(ids);
			const byId = new Map((subjects ?? []).map(subject => [subject.id, subject]));
			this.historySubjects = enrichSubjectsWithSchoolGrades(
				ids.map(id => byId.get(id)).filter(Boolean),
			);
		},
		async clearHistory() {
			await clearSearchHistory();
			this.historySubjects = [];
		},
		/** Typed (in hiragana mode, already converted by the field, IME-style). */
		onQuery(value) {
			this.searchQuery = value;
			this.search();
		},
		async search(input) {
			// Only programmatic searches (history, related items, route) rewrite the input box.
			// While typing, the box keeps what the user typed (e.g. a trailing "n").
			const fromCaller = typeof input === 'string';
			let query = (fromCaller ? input : this.searchQuery).trim();
			// The search term itself is fully converted, so "かn" searches for "かん".
			query = this.hasKana(query) ? toHiragana(query) : query;
			if (this.searchTypeKana && !this.hasKana(query))
				query = toHiragana(query);

			const seq = ++this.searchSeq;

			if (!query) {
				this.rawResults = [];
				this.results = [];
				this.nResults = 0;
				void this.loadSearchHistory();
				return;
			}

			if (fromCaller && this.searchQuery !== query)
				this.searchQuery = query;

			// add search query to history
			this.$router.push({ name: 'Search', query: { q: query, type: this.searchTypeKana ? 'kana' : 'romaji' } });

			if (!this.wkManager) return;

			let subjects = [];
			try {
				subjects = await this.runQuery(query);
			} catch (error) {
				console.error('[Search] query failed:', error);
			}

			// a newer keystroke already started another search
			if (seq !== this.searchSeq) return;

			this.rawResults = rankExactMatchesFirst(subjects ?? [], query);
			this.applySearchFilters();
		},
		/**
		 * Search the local cache only (like v1.x): no API requests per keystroke.
		 * Assignment data in the cache is kept fresh by the dashboard refresh.
		 */
		async runQuery(query) {
			const searchOptions = {
				precise: this.settingsStore.settings.search.targeted_search,
				cacheOnly: true,
			};

			// "legacy": the subjects WaniKani retired (no longer in lessons or reviews), from the
			// whole cache (the ones in memory can still be loading)
			if (this.isLegacyQuery(query)) {
				const ids = (await this.wkManager.storage.getMaterials())
					.filter(subject => subject.hidden_at)
					.map(subject => subject.id);
				return ids.length ? this.wkManager.readSubjectsById(ids) : [];
			}
			if (!isNaN(query)) {
				const level = parseInt(query, 10);
				const ids = await this.wkManager.storage.getIdsByLevel([level]);
				if (ids.length) return this.wkManager.readSubjectsById(ids);
				// level not synced yet: fetch it once from the API
				return this.wkManager.getSubjectsByLevel(level, null);
			}
			if (this.hasKanji(query))
				return this.wkManager.querySubjectsByCharacters(query, null, searchOptions);
			if (isHiragana(query) || isKatakana(query))
				return this.wkManager.querySubjectsByReading(toHiragana(query), null, searchOptions);
			return this.wkManager.querySubjectsByMeaning(query, null, searchOptions);
		},
		isLegacyQuery(query) {
			return String(query ?? '').trim().toLowerCase() === 'legacy';
		},
		hasKanji(text) {
			const kanjiRegex = /[\u4E00-\u9FAF]/;
			return kanjiRegex.test(text);
		},
		hasKana(text) {
			const kanaRegex = /[\u3040-\u309F\u30A0-\u30FF]/;
			return kanaRegex.test(text);
		},
		/** A / あ switched (the field converts what's typed, then sends it: searched then). */
		onKanaChange(kana) {
			this.searchTypeKana = kana;
			this.$router.push({ name: 'Search', query: { q: this.searchQuery, type: kana ? 'kana' : 'romaji' } });
			this.$nextTick(() => this.search());
		}
	}
};
</script>

<style scoped>
.container {
	background-color: var(--default-color);
}

.searchArea {
	width: 100%;
}

/* the field, the count and the layouts on a line; the filters on the next */
.searchMenu {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px 12px;
	padding: 12px 12px 10px;
	justify-content: space-between;
	background-color: var(--default-color);
}

.search-filters-row {
	flex: 0 0 100%;
}

/* the shared field (KanaSearchInput), a bit taller here: the page's main control */
.search-field {
	height: 34px;
}

.search-field :deep(.kana-search-input),
.search-field :deep(.kana-search-input:focus) {
	font-size: 14px;
}

.search-loading {
	margin: 10px !important;
}

.searchResults {
	background-color: var(--fill-color);
	/* down to the bottom of the window, whatever its height (not past it: no stray scroll) */
	min-height: calc(100vh - 153px);
	border-top-left-radius: 10px;
	border-top-right-radius: 10px;
	overflow: hidden;
}

#searchResultNavbar {
	display: flex;
	padding: 7px 0;
}

.searchResultNavbarOptionsWrapper {
	position: relative;
	/* count, layout switch, separators and menu share one center line */
	align-items: center;
}

.searchResultNavbarOptionsWrapper img {
	width: 22px;
	pointer-events: none;
	filter: invert(1);
}

/* Detailed / Compact / Tiles switch (on the dark header in both themes) */
.search-display-modes {
	display: flex;
	align-items: center;
	gap: 2px;
	padding: 2px;
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.08);
}

.search-display-mode {
	display: flex;
	padding: 4px;
	border: none;
	border-radius: 6px;
	background: transparent;
	cursor: pointer;
	transition: background-color 0.15s;
}

.search-display-mode svg {
	width: 17px;
	height: 17px;
	fill: rgba(255, 255, 255, 0.55);
	transition: fill 0.15s;
}

.search-display-mode:hover svg {
	fill: #fff;
}

.search-display-mode.active {
	background: var(--pill-color, #e36f94);
}

.search-display-mode.active svg {
	fill: #fff;
}

.searchResultNavbarOption {
	padding: 0 4px;
}

.searchResultNavbarTarget:hover,
.searchResultNavbarOption:hover {
	opacity: 1 !important;
}

.searchResultNavbarOption:not(:last-child) {
	padding: 0 4px;
}

.searchResultNavbarOption>img {
	pointer-events: none;
	border-radius: 2px;
}

.searchResultNavbarTarget {
	opacity: 0.5;
}

.searchOptionSeparator {
	align-self: center;
	height: 20px;
	margin: 0 9px;
	width: 2px;
	background-color: silver;
}

#nmrKanjiFound {
	width: 100%;
	margin: auto;
	font-size: 16px;
	font-weight: bold;
	text-align: center;
	color: white
}

#nmrKanjiFound>span {
	vertical-align: middle;
}

.subject-type-icon {
	font-weight: bold;
}

#searchMenuButton {
	display: flex;
	align-items: center;
	padding: 0px 4px;
	padding-right: 10px;
}

.search-history {
	padding-top: 4px;
}

.search-history-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 14px 6px;
}

.search-history-actions {
	display: flex;
	align-items: center;
	gap: 10px;
}

.search-history-title {
	font-size: 13px;
	font-weight: 700;
	color: var(--heading-color, #2a2d48);
}

.search-history-count {
	font-size: 12px;
	color: var(--muted-color);
	font-variant-numeric: tabular-nums;
}

.search-history-hidden {
	padding: 24px 14px;
	font-size: 12.5px;
	color: var(--font-sec-color);
	text-align: center;
}

.search-history-clear {
	border: none;
	background: transparent;
	padding: 0;
	font: inherit;
	font-size: 12px;
	font-weight: 700;
	color: var(--wanikani);
	cursor: pointer;
}

.search-history-clear:hover {
	opacity: 0.8;
}

.search-history :deep(.panel-content) {
	border-radius: 0;
}

.no-results {
	text-align: center;
	padding: 10px;
	color: rgb(197, 197, 197);
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	gap: 5px;
}

.no-results span:first-child {
	font-size: 50px;
}

.searchResultItemWrapper {
	font-size: 15px;
	text-align: center;
	/* fits the 600px popup (406px, under the filters); taller windows (popped out, mobile) use their height */
	max-height: max(406px, calc(100vh - 194px));
	overflow: auto;
	padding-top: 6px;
}

.searchResultItemWrapper::-webkit-scrollbar {
	width: 0;
}

.searchResultItemWrapper::-webkit-scrollbar-track {
	background: var(--fill-color);
}

.searchResultItemWrapper::-webkit-scrollbar-thumb {
	background-color: var(--default-color);
	border-radius: 20px;
}
</style>

<style>
.subjects-list-content .subjects-list {
	padding-bottom: 10px;
}
</style>