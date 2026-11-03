<template>
	<div class="container sentence-library">
		<PagesSectionSwitch active="sentences" />

		<p v-if="loaded && !all.length" class="sentence-library-empty">
			<template v-if="sentencesOn">No sentences kept yet: they come from the pages you read from now on.</template>
			<template v-else>
				Sentences are kept from the pages you read when
				<RouterLink :to="{ name: 'Settings', query: { tab: 'reading', section: 'sentences' } }">Settings → Reading → Keep example sentences</RouterLink>
				is on.
			</template>
		</p>

		<template v-else-if="all.length">
			<!-- how much there is -->
			<div class="sentence-library-summary">
				<span><b>{{ all.length }}</b> {{ all.length === 1 ? 'sentence' : 'sentences' }}</span>
				<span v-if="subjectCount !== null"><b>{{ subjectCount }}</b> subjects in them</span>
				<span v-if="archivedCount"><b>{{ archivedCount }}</b> from older pages</span>
			</div>

			<!-- search, sort, filters -->
			<div class="sentence-library-controls">
				<KanaSearchInput
					v-model="query"
					v-model:kana="kanaSearch"
					placeholder="A word, a reading, any text or English"
					kana-placeholder="はなす (finds 話していました)"
					aria-label="Search sentences"
				/>
				<select v-model="sort" class="sentence-library-select" aria-label="Sort">
					<option value="easiest">Easiest first</option>
					<option value="newest">Newest first</option>
				</select>
			</div>
			<div class="sentence-library-filters">
				<button
					v-for="filter in FILTERS"
					:key="filter.id"
					type="button"
					class="sentence-library-chip"
					:class="{ on: filters.includes(filter.id) }"
					:aria-pressed="filters.includes(filter.id)"
					:title="filter.title"
					@click="toggleFilter(filter.id)"
				>{{ filter.label }}</button>
				<select v-if="sites.length > 1" v-model="site" class="sentence-library-select small" aria-label="Site">
					<option value="">All sites</option>
					<option v-for="entry in sites" :key="entry.host" :value="entry.host">{{ entry.host }} ({{ entry.count }})</option>
				</select>
			</div>
			<p class="sentence-library-count">
				<template v-if="filtering">{{ matching.length }} of {{ all.length }} · <button type="button" class="sentence-library-reset" @click="resetFilters">Clear filters</button></template>
				<template v-else>{{ all.length }} {{ all.length === 1 ? 'sentence' : 'sentences' }}</template>
				<button
					v-if="matching.length"
					type="button"
					class="sentence-library-export"
					:title="`A file Anki can import (File → Import): sentence, translation, source, words. ${filtering ? 'The ones shown' : 'All of them'}`"
					@click="exportAnki"
				>Export for Anki</button>
			</p>

			<!-- the sentences, a chunk at a time as the list is scrolled -->
			<ol
				ref="list"
				lang="ja"
				class="sentence-library-list wkh-highlight-scope"
				:style="highlightVars"
				@click="openHighlighted"
			>
				<li v-for="item in shown" :key="item.key" class="sentence-library-card">
					<span class="sentence-library-text">{{ item.sentence }}</span>
					<span v-if="item.translation" lang="en" class="sentence-library-translation">
						{{ item.translation }}
						<span class="sentence-library-mt" title="Machine translation, on this device" aria-label="Machine translation"></span>
					</span>
					<!-- the words you're learning in it -->
					<span v-if="learningOf(item.sentence).length" lang="ja" class="sentence-library-subjects">
						<!-- its text drawn by CSS: as text, the sentence's highlighting would mark it again -->
						<span
							v-for="subject in learningOf(item.sentence)"
							:key="subject.key"
							class="sentence-library-subject"
							:style="{ background: subject.color }"
							:title="subject.title"
							:data-text="subject.text"
							:aria-label="subject.text"
						></span>
					</span>
					<span lang="en" class="sentence-library-meta">
						<a :href="item.url" target="_blank" rel="noopener noreferrer" :title="item.title">{{ item.host }} ↗</a>
						<RouterLink
							v-if="!item.archived"
							:to="{ name: 'Page', query: { url: item.url } }"
							title="This page in Pages read"
						>Page</RouterLink>
						<span>{{ when(item.at) }}</span>
						<button
							v-if="canTranslate && !item.translation"
							type="button"
							class="sentence-library-pill"
							:disabled="Boolean(translating[item.key])"
							title="Translate to English, on this device (nothing is sent anywhere)"
							@click.stop="translate(item)"
						>{{ translateLabel(item.key) }}</button>
					</span>
					<span class="sentence-library-actions">
						<button
							type="button"
							class="sentence-library-icon"
							title="See this sentence handwritten (stroke order)"
							@click.stop="handwriting = item"
						><SentenceWriteIcon /></button>
						<button
							type="button"
							class="sentence-library-icon remove"
							title="Remove this sentence"
							aria-label="Remove this sentence"
							@click.stop="remove(item)"
						>
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
						</button>
					</span>
				</li>
			</ol>
			<div v-if="shown.length < matching.length" ref="more" class="sentence-library-more">Loading more…</div>
			<p v-if="!matching.length" class="sentence-library-empty">No sentences match.</p>
		</template>

		<SentenceHandwriting
			v-if="handwriting"
			:sentence="handwriting.sentence"
			:translation="handwriting.translation"
			@close="handwriting = null"
		/>
	</div>
</template>

<script>
import { RouterLink } from 'vue-router';
import { useWKStore } from '@/stores';
import { useSettingsStore } from '@/stores/settings';
import PagesSectionSwitch from '@/components/PageStats/PagesSectionSwitch.vue';
import KanaSearchInput from '@/components/KanaSearchInput.vue';
import SentenceHandwriting from '@/components/Subjects/SubjectDisplay/SentenceHandwriting.vue';
import SentenceWriteIcon from '@/components/Subjects/SubjectDisplay/SentenceWriteIcon.vue';
import {
	readPageHistory,
	readSentenceArchive,
	removeOneSentence,
	saveArchivedTranslation,
	saveSentenceTranslation,
	watchPageHistory,
	watchSentenceArchive,
} from '@/utils/scripts/pageHistory';
import { librarySentences, sentencesAsAnkiFile } from '@/utils/scripts/sentenceLibrary';
import { sentenceWordReader } from '@/utils/scripts/sentenceWords';
import { canTranslateSentences, translateSentence } from '@/utils/scripts/sentenceTranslation';
import { highlightElement } from '@/utils/highlight/subjectDetailsHighlight';
import { HIGHLIGHT_MARK_CLASS, highlightValueOf } from '@/utils/highlight/highlighter';
import { highlightStyleVarsFromSettings, srsAppearanceVarsFromSettings } from '@/utils/highlight/highlightStyleVars';
import { getSrsStageColor, SRS_STAGE_SECTIONS } from '@/utils/highlight/srsStageHighlight';
import { notificationTime } from '@/utils/scripts/notifications';
import { isKana, toHiragana } from 'wanakana';

/** sentences added to the list each time its end comes into view */
const CHUNK = 30;
/** the stages of the subjects you're learning (Apprentice, Guru) */
const LEARNING = ['1', '2', '3', '4', '5', '6'];

const FILTERS = [
	{ id: 'learning', label: 'Words I\'m learning', title: 'With a word or kanji you have in Apprentice or Guru' },
	{ id: 'easy', label: 'Easy', title: 'No kanji you haven\'t learned' },
	{ id: 'translated', label: 'Translated', title: 'Translated already' },
	{ id: 'untranslated', label: 'Not translated', title: 'Not translated yet' },
];

export default {
	name: 'SentenceLibrary',

	components: { RouterLink, PagesSectionSwitch, SentenceHandwriting, SentenceWriteIcon, KanaSearchInput },

	data() {
		return {
			FILTERS,
			entries: [],
			archive: [],
			loaded: false,
			/** the words / kanji of a sentence (sentenceWords.ts; null until ready) */
			reader: null,
			query: typeof this.$route.query.q === 'string' ? this.$route.query.q : '',
			/** from a word's page (?q=話&type=vocabulary): that word only, not its characters in others (話す) */
			wordOnly: ['vocabulary', 'kana_vocabulary'].includes(String(this.$route.query.type ?? '')),
			/** romaji typed as hiragana (the search's あ) */
			kanaSearch: false,
			sort: 'easiest',
			filters: [],
			site: '',
			/** how many of the matching ones are shown (more as the list is scrolled) */
			limit: CHUNK,
			canTranslate: false,
			/** key → true (translating), a 0–1 share (the model downloading), or 'failed' */
			translating: {},
			handwriting: null,
		};
	},

	computed: {
		settings() {
			return useSettingsStore().settings;
		},
		sentencesOn() {
			return this.settings.page_stats?.history === true && this.settings.page_stats?.sentences === true;
		},
		all() {
			return librarySentences(this.entries, this.archive);
		},
		archivedCount() {
			return this.all.filter(item => item.archived).length;
		},
		/** subjects in all the sentences (once the words are read) */
		subjectCount() {
			if (!this.reader) return null;
			const subjects = new Set();
			for (const item of this.all) for (const subject of this.reader.subjects(item.sentence)) subjects.add(subject);
			return subjects.size;
		},
		sites() {
			const counts = new Map();
			for (const item of this.all) counts.set(item.host, (counts.get(item.host) ?? 0) + 1);
			return [...counts].map(([host, count]) => ({ host, count })).sort((a, b) => b.count - a.count);
		},
		filtering() {
			return Boolean(this.query || this.filters.length || this.site);
		},
		/** a subject ("w:話す", "k:話") → its reading, in hiragana (for searching in kana) */
		readings() {
			const readings = new Map();
			for (const subject of useWKStore().allSubjects) {
				if (!subject.characters || !subject.reading) continue;
				const prefix = subject.type === 'kanji' ? 'k:' : subject.type === 'radical' ? '' : 'w:';
				if (prefix) readings.set(`${prefix}${subject.characters}`, toHiragana(subject.reading));
			}
			return readings;
		},
		/** the sentences matching the search and filters, sorted */
		matching() {
			// kana mode: romaji still waiting for its next key ("n", a lone capital) isn't searched for yet
			const query = this.query.trim().replace(this.kanaSearch ? /[a-z]+$/i : /$^/, '');
			const reader = this.reader;
			const kanaQuery = query && isKana(query) ? toHiragana(query) : '';
			const lowerQuery = query.toLowerCase();
			/**
			 * A sentence a search finds: the word in it (as the highlighter finds it: 話す in
			 * 話していました), its text, its translation, or (kana typed) its kana and the
			 * readings of its words and kanji (はなす finds 話していました)
			 */
			const found = item => {
				if (reader && reader.words(item.sentence).has(query)) return true;
				// from a word's page: that word only
				if (this.wordOnly && reader) return false;
				if (item.sentence.includes(query)) return true;
				if (item.translation && item.translation.toLowerCase().includes(lowerQuery)) return true;
				if (!kanaQuery) return false;
				if (toHiragana(item.sentence).includes(kanaQuery)) return true;
				return Boolean(reader && reader.subjects(item.sentence).some(subject => this.readings.get(subject)?.includes(kanaQuery)));
			};
			const list = this.all.filter(item => {
				if (query && !found(item)) return false;
				if (this.site && item.host !== this.site) return false;
				if (this.filters.includes('translated') && !item.translation) return false;
				if (this.filters.includes('untranslated') && item.translation) return false;
				if (reader && this.filters.includes('easy') && reader.unknownKanji(item.sentence) > 0) return false;
				if (reader && this.filters.includes('learning') && !this.learningOf(item.sentence).length) return false;
				return true;
			});
			if (this.sort === 'easiest' && reader) {
				return list
					.map(item => ({ item, unknown: reader.unknownKanji(item.sentence) }))
					.sort((a, b) => a.unknown - b.unknown || b.item.at - a.item.at)
					.map(entry => entry.item);
			}
			return list;
		},
		shown() {
			return this.matching.slice(0, this.limit);
		},
		highlightVars() {
			return { ...highlightStyleVarsFromSettings(this.settings), ...srsAppearanceVarsFromSettings(this.settings) };
		},
	},

	watch: {
		// another search / filter: from the top again (a search typed: any match again)
		query(value) {
			this.limit = CHUNK;
			if (value !== this.$route.query.q) this.wordOnly = false;
		},
		filters() {
			this.limit = CHUNK;
		},
		site() {
			this.limit = CHUNK;
		},
		sort() {
			this.limit = CHUNK;
		},
		shown(rows) {
			// other cards: highlighted (as on pages), and watched for the end of the list
			const keys = rows.map(row => row.key).join('\n');
			if (keys === this.shownKeys) return;
			this.shownKeys = keys;
			this.$nextTick(() => {
				void highlightElement(this.$refs.list);
				this.observeEnd();
			});
			void this.autoTranslate();
		},
		canTranslate() {
			void this.autoTranslate();
		},
	},

	async created() {
		this.translatedKeys = new Set();
		void canTranslateSentences().then(can => { this.canTranslate = can; });
		void sentenceWordReader().then(reader => { this.reader = reader; });
		[this.entries, this.archive] = await Promise.all([readPageHistory(), readSentenceArchive()]);
		this.loaded = true;
		this.unwatch = watchPageHistory(entries => { this.entries = entries; });
		this.unwatchArchive = watchSentenceArchive(items => { this.archive = items; });
	},

	beforeUnmount() {
		this.unwatch?.();
		this.unwatchArchive?.();
		this.endObserver?.disconnect();
	},

	methods: {
		when(at) {
			return notificationTime(at);
		},
		toggleFilter(id) {
			const opposite = { translated: 'untranslated', untranslated: 'translated' }[id];
			this.filters = this.filters.includes(id)
				? this.filters.filter(filter => filter !== id)
				: [...this.filters.filter(filter => filter !== opposite), id];
		},
		resetFilters() {
			this.query = '';
			this.filters = [];
			this.site = '';
		},
		/** the subjects you're learning in a sentence, as chips (SRS colours) */
		learningOf(sentence) {
			if (!this.reader) return [];
			const appearance = this.settings.appearance ?? {};
			return this.reader.subjects(sentence)
				.map(key => ({ key, stage: this.reader.stageOf(key) }))
				.filter(entry => LEARNING.includes(entry.stage))
				// a word's kanji: the word is enough
				.filter((entry, _index, list) => entry.key.startsWith('w:')
					|| !list.some(other => other.key.startsWith('w:') && other.key.includes(entry.key.slice(2))))
				.map(({ key, stage }) => ({
					key,
					text: key.slice(2),
					color: getSrsStageColor(stage, appearance),
					title: `${key.startsWith('w:') ? 'Word' : 'Kanji'} · ${SRS_STAGE_SECTIONS.find(section => section.key === stage)?.label ?? ''}`,
				}));
		},
		/** more of the list when its end comes into view */
		observeEnd() {
			this.endObserver?.disconnect();
			const more = this.$refs.more;
			if (!more) return;
			this.endObserver = new IntersectionObserver(entries => {
				if (entries.some(entry => entry.isIntersecting)) this.limit += CHUNK;
			}, { rootMargin: '300px 0px' });
			this.endObserver.observe(more);
		},
		/** a highlighted kanji / word: its subject's page */
		async openHighlighted(event) {
			const span = event.target instanceof Element ? event.target.closest(`span.${HIGHLIGHT_MARK_CLASS}`) : null;
			const value = span ? highlightValueOf(span) : '';
			if (!value) return;
			const [subject] = await useWKStore().getHighlightedSubjects([{ value, type: span.getAttribute('data-wkh-type') ?? undefined }]);
			if (subject?.id != null) this.$router.push({ name: 'Subject', params: { id: subject.id } });
		},
		async remove(item) {
			await removeOneSentence(item.url, item.sentence);
		},
		exportAnki() {
			const text = sentencesAsAnkiFile(this.matching, sentence => (this.reader ? this.reader.subjects(sentence) : []));
			const url = URL.createObjectURL(new Blob([text], { type: 'text/tab-separated-values;charset=utf-8' }));
			const link = document.createElement('a');
			link.href = url;
			link.download = `wanikani-highlighter-sentences-${new Date().toISOString().slice(0, 10)}.txt`;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		},
		translateLabel(key) {
			const state = this.translating[key];
			if (state === 'failed') return 'Couldn\'t translate';
			if (typeof state === 'number') return `Getting the translator… ${Math.round(state * 100)}%`;
			return state ? 'Translating…' : 'Translate';
		},
		/**
		 * Translated on the device, kept with the sentence. `auto`: not clicked; failing then (no
		 * click for the first download) leaves the button to click.
		 */
		async translate(item, { auto = false } = {}) {
			this.translating = { ...this.translating, [item.key]: true };
			try {
				const translation = await translateSentence(item.sentence, share => {
					this.translating = { ...this.translating, [item.key]: share };
				});
				if (!translation) throw new Error('empty');
				this.translatedKeys.add(item.key);
				if (item.archived) await saveArchivedTranslation(item.url, item.sentence, translation);
				else await saveSentenceTranslation(item.url, item.sentence, translation);
				const { [item.key]: _done, ...rest } = this.translating;
				this.translating = rest;
				if (!auto && this.autoBlocked) {
					this.autoBlocked = false;
					void this.autoTranslate();
				}
				return true;
			} catch {
				if (auto) {
					const { [item.key]: _left, ...rest } = this.translating;
					this.translating = rest;
					this.autoBlocked = true;
				} else {
					this.translating = { ...this.translating, [item.key]: 'failed' };
				}
				return false;
			}
		},
		/** The sentences on screen without a translation, one at a time (as on a subject's page). */
		async autoTranslate() {
			if (!this.canTranslate || this.autoBlocked || this.autoRunning) return;
			this.autoRunning = true;
			const waiting = () => this.shown.filter(item => !item.translation && !this.translating[item.key] && !this.translatedKeys.has(item.key));
			try {
				for (let items = waiting(); items.length && !this.autoBlocked; items = waiting()) {
					for (const item of items) {
						if (!(await this.translate(item, { auto: true }))) break;
					}
				}
			} finally {
				this.autoRunning = false;
			}
		},
	},
};
</script>

<style scoped>
.sentence-library {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding-bottom: 20px;
	background-color: var(--default-color);
	color: #fff;
}

.sentence-library-empty {
	margin: 10px 4px;
	padding: 16px;
	border-radius: 12px;
	background: rgba(255, 255, 255, 0.05);
	color: #c4c6da;
	font-size: 12.5px;
	line-height: 1.5;
	text-align: center;
}

.sentence-library-empty a {
	color: #e36f94;
}

.sentence-library-summary {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 14px;
	padding: 2px 6px;
	font-size: 12px;
	color: #a9acc2;
}

.sentence-library-summary b {
	color: #fff;
}

.sentence-library-controls {
	display: flex;
	gap: 6px;
	padding: 0 4px;
}

.sentence-library-search {
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

.sentence-library-search::placeholder {
	color: #9a9db4;
}

.sentence-library-select {
	padding: 5px 8px;
	border: 1px solid rgba(255, 255, 255, 0.14);
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.06);
	color: #fff;
	font-family: inherit;
	font-size: 12px;
}

.sentence-library-select option {
	color: #000;
}

.sentence-library-select.small {
	max-width: 150px;
	padding: 3px 6px;
	font-size: 11.5px;
}

.sentence-library-filters {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 5px;
	padding: 0 4px;
}

.sentence-library-chip {
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

.sentence-library-chip:hover {
	background: rgba(255, 255, 255, 0.08);
}

.sentence-library-chip.on {
	border-color: #e36f94;
	background: rgba(227, 111, 148, 0.18);
	color: #fff;
}

.sentence-library-count {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 2px 6px 0;
	font-size: 11px;
	color: #9a9db4;
}

.sentence-library-reset {
	padding: 0;
	border: none;
	background: transparent;
	color: #e36f94;
	font-family: inherit;
	font-size: 11px;
	font-weight: 700;
	cursor: pointer;
}

.sentence-library-export {
	margin-left: auto;
	padding: 3px 10px;
	border: 1px solid rgba(255, 255, 255, 0.18);
	border-radius: 6px;
	background: transparent;
	color: #c4c6da;
	font-family: inherit;
	font-size: 11.5px;
	font-weight: 700;
	cursor: pointer;
}

.sentence-library-export:hover {
	background: rgba(255, 255, 255, 0.08);
	color: #fff;
}

.sentence-library-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin: 0;
	padding: 0 4px;
	list-style: none;
}

/* a card per sentence: the text, its translation, the words you're learning, where it's from */
.sentence-library-card {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 5px;
	padding: 10px 42px 10px 12px;
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.05);
}

.sentence-library-text {
	font-size: 15px;
	line-height: 1.75;
	color: #eceef6;
}

.sentence-library-translation {
	font-size: 12.5px;
	line-height: 1.45;
	color: #a9acc2;
}

.sentence-library-mt {
	display: inline-block;
	margin-left: 4px;
	padding: 0 4px;
	border: 1px solid currentColor;
	border-radius: 4px;
	font-size: 9.5px;
	font-weight: 700;
	line-height: 13px;
	vertical-align: 1px;
	opacity: 0.75;
	cursor: help;
}

/* drawn by CSS: as text, the highlighting would mark its 文 */
.sentence-library-mt::after {
	content: '文A';
}

.sentence-library-subjects {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

.sentence-library-subject {
	padding: 0 6px;
	border-radius: 5px;
	color: #fff;
	font-size: 12px;
	font-weight: 700;
	line-height: 19px;
}

.sentence-library-subject::after {
	content: attr(data-text);
}

.sentence-library-meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px 10px;
	font-size: 11.5px;
	color: #9a9db4;
}

.sentence-library-meta a {
	color: #9a9db4;
	text-decoration: none;
}

.sentence-library-meta a:hover {
	color: #fff;
	text-decoration: underline;
}

.sentence-library-pill {
	padding: 1px 8px;
	border: 1px solid rgba(255, 255, 255, 0.18);
	border-radius: 999px;
	background: transparent;
	color: #c4c6da;
	font-family: inherit;
	font-size: 11px;
	cursor: pointer;
}

.sentence-library-pill:disabled {
	cursor: default;
	opacity: 0.75;
}

/* handwriting and remove, stacked in the top right corner (the text keeps the width) */
.sentence-library-actions {
	position: absolute;
	top: 8px;
	right: 8px;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.sentence-library-icon {
	display: flex;
	padding: 5px;
	border: none;
	border-radius: 7px;
	background: rgba(255, 255, 255, 0.06);
	cursor: pointer;
	opacity: 0.75;
	transition: opacity 0.15s, background-color 0.15s;
}

.sentence-library-icon:hover {
	opacity: 1;
	background: rgba(255, 255, 255, 0.14);
}

.sentence-library-icon :deep(svg),
.sentence-library-icon svg {
	width: 15px;
	height: 15px;
	fill: none;
	stroke: #fff;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.sentence-library-icon.remove:hover {
	background: rgba(229, 72, 77, 0.35);
}

/* a highlighted kanji / word opens its subject */
.sentence-library-list :deep(span.wkhighlighter_clickable) {
	cursor: pointer;
}

.sentence-library-more {
	padding: 12px;
	font-size: 11.5px;
	color: #9a9db4;
	text-align: center;
}
</style>
