<template>
	<div class="container">
		<div class="searchArea">
			<div class="searchMenu">
				<div class="textInputWrapper">
					<img class="textInputIcon" :src="searchIcon" alt="Search">
					<input type="text" v-model="searchQuery" :placeholder="!searchTypeKana ? 'Gold / 金 / 5' : 'きん'"
						@keydown="handleKeyDown" id="kanjiSearchInput" ref="kanjiSearchInput" @input="search"
						@focus="searchInputHasFocus = true" @blur="searchInputHasFocus = false" />
					<div class="kanjiSearchTypeWrapper" title="Kana"
						:id="!searchTypeKana ? 'kanjiSearchTypeKana' : 'kanjiSearchTypeRomaji'"
						@click="handleSearchTypeChange">
						<span id="kanjiSearchType">{{ !searchTypeKana ? 'あ' :
							'A' }}</span>
					</div>
				</div>
				<div id="searchResultNavbar">
					<div class="searchResultNavbarOptionsWrapper" style="display: flex;">
						<div id="nmrKanjiFound"><span>{{ nResults }}<span></span></span></div>
						<div class="searchOptionSeparator"></div>
						<ul style="display: flex;">
							<li class="searchResultNavbarOption clickable icon" title="List" id="searchResultOptionlist"
								@click="toggleResultDisplay"><img
									:src="searchResultGrid ? '/icons/search/list.png' : '/icons/search/small-grid.png'"
									alt="List"></li>
						</ul>
						<div class="searchOptionSeparator"></div>
						<div id="searchMenuButton" class="clickable icon" title="Options"
							@click="showSearchMenu = !showSearchMenu"><img
								:src="showSearchMenu ? '/icons/search/close-medium.png' : '/icons/search/menu.png'"
								alt="Menu"></div>
						<SearchMenu
							:class="{ 'search-menu-slide-in': showSearchMenu }"
							style="right: -250px"
							@filter-change="onSearchFiltersChanged"
						/>
					</div>
				</div>
			</div>
			<div class="searchResults">
				<div v-if="nResults > 0">
					<!-- Tiles View -->
					<SubjectsList
						v-if="searchResultGrid"
						:values="results"
						type="srs"
						:colors="colors"
						:show-title="false"
						:height="445"
						menu-key="search"
					/>

					<!-- Detailed View -->
					<ul v-else class="searchResultItemWrapper">
						<SearchResultItem v-for="item in results" :key="item.id" :item="item" @search="search" />
					</ul>
				</div>
				<div v-else-if="!searchQuery.trim() && historySubjects.length" class="search-history">
					<div class="search-history-header">
						<span class="search-history-title">Recently viewed</span>
						<div class="search-history-actions">
							<span class="search-history-count">{{ historySubjects.length }}</span>
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
					<SubjectsList
						v-if="searchResultGrid"
						:values="historySubjects"
						type="srs"
						:colors="colors"
						:show-title="false"
						:show-progression-bar="false"
						:height="445"
						menu-key="search"
					/>
					<ul v-else class="searchResultItemWrapper">
						<SearchResultItem
							v-for="item in historySubjects"
							:key="item.id"
							:item="item"
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
import { useRouter } from 'vue-router';

import { isHiragana, isKatakana, toHiragana, toRomaji, bind, unbind } from 'wanakana';

import SearchMenu from '@/components/Search/SearchMenu.vue';
import SubjectsList from '@/components/Subjects/SubjectsList.vue';
import SearchResultItem from '@/components/Search/SearchResultItem.vue';

import { useSettingsStore } from '@/stores/settings';
import { typeColors } from '@/utils/scripts/wanikani';
import { filterSearchResults } from '@/utils/scripts/searchFilters';
import { clearSearchHistory, getSearchHistoryIds } from '@/utils/scripts/searchHistory';

import searchIcon from '@/assets/icons/search/search.png';

export default {
	name: 'Search',
	components: {
		SearchMenu,
		SubjectsList,
		SearchResultItem
	},
	data() {
		return {
			wkManager: null,
			fetchId: null,
			showSearchMenu: false,
			searchResultGrid: false,
			rawResults: [],
			searchInput: null,
			searchInputHasFocus: false,
			searchQuery: '',
			searchTypeKana: false,
			results: [],
			nResults: 0,
			historySubjects: [],
			colors: {},

			searchIcon,
		};
	},

	setup() {
		const { backspace, current } = useMagicKeys()
		const searchQuery = ref('');
		const searchInput = ref(null);
		const searchInputHasFocus = ref(false);
		const router = useRouter();

		// return to home page if backspace pressed on empty search
		whenever(backspace, () => {
			if (searchQuery.value === '') {
				router.push({ name: 'Home' });
			}
		});

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
		}
	},

	created() {
		this.wkManager = this.wk.manager;
		this.colors = this.typeColors;
		this.searchResultGrid = this.settingsStore.settings.search.results_display === 'searchResultOptionbig-grid';

		if (!this.wkManager) return;

		this.wkManager.events.on('get:subjects', ({ state, data, context }) => {
			if (!context) return;

			const fetchKey = context.levels ? String(context.levels[0]) : context.caller;
			if (!fetchKey || (state === 'updated' && this.fetchId !== fetchKey)) return;

			this.rawResults = data;
			this.applySearchFilters();
		});
	},

	mounted() {
		const query = this.$route.query.q;
		if (query) {
			this.searchQuery = query;
			this.search();
		}

		const searchType = this.$route.query.type;
		if (searchType === 'kana') {
			this.handleSearchTypeChange();
		}

		this.searchInput = this.$refs.kanjiSearchInput;
		this.$refs.kanjiSearchInput.focus();
		void this.loadSearchHistory();
	},

	activated() {
		void this.loadSearchHistory();
	},

	beforeUnmount() {
		this.wkManager?.events.removeListener('get:subjects');
	},

	methods: {
		applySearchFilters() {
			this.results = filterSearchResults(this.rawResults, this.searchFilterOptions);
			this.nResults = this.results.length;
		},
		onSearchFiltersChanged(key) {
			if (key === 'targeted_search') {
				if (this.searchQuery.trim()) this.search();
				return;
			}
			this.applySearchFilters();
		},
		async toggleResultDisplay() {
			this.searchResultGrid = !this.searchResultGrid;
			const display = this.searchResultGrid
				? 'searchResultOptionbig-grid'
				: 'searchResultOptionlist';
			await this.settingsStore.setSetting('search', 'results_display', display);
		},
		async loadSearchHistory() {
			const ids = await getSearchHistoryIds();
			if (!ids.length) {
				this.historySubjects = [];
				return;
			}

			const subjects = await Promise.all(
				ids.map(id => this.wk.getSubjectById(id)),
			);
			this.historySubjects = subjects.filter(Boolean);
		},
		async clearHistory() {
			await clearSearchHistory();
			this.historySubjects = [];
		},
		search(query) {
			// sanitize input
			query = typeof query === 'string' ? query.trim() : this.searchQuery.trim();
			query = this.hasKana(query) ? toHiragana(query) : query;
			if (this.searchTypeKana && !this.hasKana(query))
				query = toHiragana(query);

			if (!query) {
				this.rawResults = [];
				this.results = [];
				this.nResults = 0;
				void this.loadSearchHistory();
				return;
			}

			if (this.searchQuery !== query)
				this.searchQuery = query;

			// add search query to history
			this.$router.push({ name: 'Search', query: { q: query, type: this.searchTypeKana ? 'kana' : 'romaji' } });

			this.fetchId = query;
			const searchOptions = {
				precise: this.settingsStore.settings.search.targeted_search,
			};
			if (!isNaN(query))
				this.wkManager.getSubjectsByLevel(parseInt(query));
			else if (this.hasKanji(query))
				this.wkManager.querySubjectsByCharacters(query, null, searchOptions);
			else if (isHiragana(query) || isKatakana(query))
				this.wkManager.querySubjectsByReading(toHiragana(query), null, searchOptions);
			else
				this.wkManager.querySubjectsByMeaning(query, null, searchOptions);
		},
		hasKanji(text) {
			const kanjiRegex = /[\u4E00-\u9FAF]/;
			return kanjiRegex.test(text);
		},
		hasKana(text) {
			const kanaRegex = /[\u3040-\u309F\u30A0-\u30FF]/;
			return kanaRegex.test(text);
		},
		handleSearchTypeChange() {
			this.searchTypeKana = !this.searchTypeKana;

			this.$router.push({ name: 'Search', query: { q: this.searchQuery, type: this.searchTypeKana ? 'kana' : 'romaji' } });

			if (this.searchTypeKana) {
				this.searchQuery = toHiragana(this.searchQuery);
				bind(this.$refs.kanjiSearchInput);
			}
			else {
				this.searchQuery = toRomaji(this.searchQuery);
				try {
					unbind(this.$refs.kanjiSearchInput);
				} catch (error) {
					console.error('Error unbinding input:', error);
				}
			}

			this.$refs.kanjiSearchInput.focus();
			this.search();
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

.searchMenu {
	display: flex;
	align-items: center;
	gap: 15px;
	padding: 15px;
	padding-right: unset;
	justify-content: space-between;
	background-color: var(--default-color);
}

.textInputWrapper {
	display: flex;
	border-radius: 17px;
	padding: 4px 6px;
	position: relative;
	height: 20px;
	align-items: center;
	background-color: var(--fill-color);
	border: 2px solid white;
}

.textInputWrapper input {
	width: 100%;
	margin-right: 8px;
}

#kanjiSearchInput {
	width: 100%;
	border: 0;
	font-size: 15px;
}

#kanjiSearchInput:focus {
	outline: none;
}

#kanjiSearchInput::placeholder {
	color: gray;
}

.textInputIcon {
	margin-right: 5px;
	border-right: 1px solid var(--surface-border-color);
	width: 14px;
	height: 14px;
	opacity: 0.7;
	background-color: var(--fill-color);
	padding: 8px;
	border-top-left-radius: 50%;
	border-bottom-left-radius: 50%;
	margin-left: -6px;
}

.kanjiSearchTypeWrapper {
	color: white;
	padding: 0px;
	position: absolute;
	right: 0px;
	bottom: 0px;
	border-top-right-radius: 16px;
	border-bottom-right-radius: 16px;
	cursor: pointer;
	width: 26px;
	text-align: center;
	height: 100%;
}

#kanjiSearchTypeRomaji {
	font-size: 20px;
	background-color: var(--wanikani);
}

#kanjiSearchTypeKana {
	font-size: 15px;
	background-color: var(--wanikani-sec);
}

#kanjiSearchType {
	top: -3px;
	bottom: 0;
	position: absolute;
	left: 0;
	right: 2px;
	margin: auto;
	height: fit-content;
}

.search-loading {
	margin: 10px !important;
}

.searchResults {
	background-color: var(--fill-color);
	min-height: 480px;
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
}

.searchResultNavbarOptionsWrapper img {
	width: 22px;
	pointer-events: none;
	filter: invert(1);
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
	margin: 5px 9px;
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
	color: var(--default-color);
}

.search-history-count {
	font-size: 12px;
	color: var(--muted-color);
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
	max-height: 475px;
	overflow: auto;
	padding-top: 2px;
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