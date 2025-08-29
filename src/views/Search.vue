<template>
	<div class="container">
		<div class="searchArea">
			<div class="searchMenu">
				<div class="textInputWrapper">
					<img class="textInputIcon" :src="searchIcon" alt="Search">
					<input type="text" v-model="searchQuery" :placeholder="!searchTypeKana ? 'Gold / 金 / 5' : 'きん'"
						id="kanjiSearchInput" ref="kanjiSearchInput" @input="search" />
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
								@click="searchResultGrid = !searchResultGrid"><img
									:src="searchResultGrid ? '/icons/search/list.png' : '/icons/search/small-grid.png'"
									alt="List"></li>
						</ul>
						<div class="searchOptionSeparator"></div>
						<div id="searchMenuButton" class="clickable icon" title="Options"
							@click="showSearchMenu = !showSearchMenu"><img
								:src="showSearchMenu ? '/icons/search/close-medium.png' : '/icons/search/menu.png'"
								alt="Menu"></div>
						<SearchMenu @close="showSearchMenu = false" :class="{ 'search-menu-slide-in': showSearchMenu }"
							style="right: -250px" />
					</div>
				</div>
			</div>
			<div class="searchResults">
				<div v-if="nResults === 0" class="no-results">
					<span>金</span>
					<span>No results found</span>
				</div>
				<template v-else>
					<!-- Tiles View -->
					<SubjectsList v-if="searchResultGrid" :values="results" type="srs" :grid="searchResultGrid"
						:colors="colors" :showTitle="false" :height="445" />

					<!-- Detailed View -->
					<ul v-else class="searchResultItemWrapper">
						<SearchResultItem v-for="item in results" :key="item.id" :item="item" @search="search" />
					</ul>
				</template>
			</div>
		</div>
	</div>

</template>

<script>
import { getWKManager } from '@/lib/apiClient';
import { isHiragana, isKatakana, toHiragana, toRomaji, bind, unbind } from 'wanakana';

import SearchMenu from '@/components/Search/SearchMenu.vue';
import SubjectsList from '@/components/Subjects/SubjectsList.vue';
import SearchResultItem from '@/components/Search/SearchResultItem.vue';

import { typeColors } from '@/utils/scripts/wanikani';

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
			showSearchMenu: false,
			searchResultGrid: true,
			searchIcon,
			searchQuery: '',
			searchTypeKana: false,
			results: [],
			nResults: 0,
			colors: {}
		};
	},

	computed: {
		typeColors() {
			return typeColors;
		}
	},

	created() {
		this.wkManager = getWKManager();
		this.colors = this.typeColors;

		this.wkManager.events.on('get:subjects', ({ state, data }) => {
			// console.log('Subjects fetched:', data);
			this.results = data;
			this.nResults = data.length;
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

		this.$refs.kanjiSearchInput.focus();
	},

	onBeforeUnmount() {
		this.wkManager.events.removeListener('get:subjects');
	},

	methods: {
		search(query) {
			console.log('Search query:', query);
			// sanitize input
			query = typeof query === 'string' ? query.trim() : this.searchQuery.trim();
			query = this.hasKana(query) ? toHiragana(query) : query;
			if (this.searchTypeKana && !this.hasKana(query))
				query = toHiragana(query);

			if (!query) {
				this.results = [];
				this.nResults = 0;
				return;
			}

			if (this.searchQuery !== query)
				this.searchQuery = query;

			// add search query to history
			this.$router.push({ name: 'Search', query: { q: query, type: this.searchTypeKana ? 'kana' : 'romaji' } });

			if (!isNaN(query))
				this.wkManager.getSubjectsByLevel(parseInt(query));
			else if (this.hasKanji(query))
				this.wkManager.querySubjectsByCharacters(query);
			else if (isHiragana(query) || isKatakana(query))
				this.wkManager.querySubjectsByReading(toHiragana(query));
			else
				this.wkManager.querySubjectsByMeaning(query);
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
	},
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
	background-color: white;
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
	border-right: 1px solid #797979;
	width: 14px;
	height: 14px;
	opacity: 0.7;
	background-color: white;
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
	background-color: white;
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
	background: white;
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