<template>
	<!-- sentences kept from the pages read (Keep example sentences) that have this kanji / word -->
	<div v-if="rows.length" class="sd-detailsPopup_sectionContainer">
		<div class="sd-readingSentences_head">
			<strong class="sd-popupDetails_title">From your reading</strong>
			<!-- the extension: all its sentences, on the Sentences page -->
			<a
				v-if="linkLibrary && $router"
				href="#"
				class="sd-readingSentences_all"
				:title="`Every sentence kept with ${item.characters}: search, filter, export`"
				@click.prevent="$router.push({ name: 'Sentences', query: { q: item.characters, type: item.type } })"
			>All sentences ›</a>
		</div>
		<!-- as the context sentences: a card each, the sentence then (in the muted line) its page -->
		<ul
			v-for="row in shown"
			:key="row.key"
			class="sd-detailsPopup_sentencesWrapper sd-readingSentences"
		>
			<li class="sd-popupDetails_p sd-sentence">
				<span lang="ja">{{ row.text }}</span>
				<!-- the muted line: its translation (asked for), then where it's from -->
				<span class="sd-readingSentence_meta">
					<span v-if="row.translation" class="sd-readingSentence_translation">
						{{ row.translation }}
						<!-- marked as a machine translation -->
						<span class="sd-mtMark" title="Machine translation, on this device" aria-label="Machine translation"></span>
					</span>
					<span class="sd-readingSentence_row">
						<a
							class="sd-readingSentence_source"
							:href="row.url"
							target="_blank"
							rel="noopener noreferrer"
							:title="row.title"
						>{{ row.host }} ↗</a>
						<!-- only where the browser can translate on the device -->
						<button
							v-if="canTranslate && !row.translation"
							type="button"
							class="sd-readingSentence_translate"
							:disabled="Boolean(translating[row.key])"
							title="Translate to English, on this device (nothing is sent anywhere)"
							@click.stop="translate(row)"
						>{{ translateLabel(row.key) }}</button>
					</span>
				</span>
				<button
					type="button"
					class="sd-sentence-write sd-detailsPopup_clickable"
					title="See this sentence handwritten (stroke order)"
					@click.stop="$emit('handwriting', { ja: row.text, en: row.translation })"
				>
					<SentenceWriteIcon />
				</button>
			</li>
		</ul>
		<!-- the rest: a full-width bar under the cards, its chevron pointing where they go -->
		<button
			v-if="rows.length > LIMIT"
			type="button"
			class="sd-readingSentences_more"
			:aria-expanded="expanded"
			@click="expanded = !expanded"
		>
			<span>{{ expanded ? 'Show fewer' : `Show all ${rows.length} sentences` }}</span>
			<svg viewBox="0 0 24 24" aria-hidden="true" :class="{ up: expanded }"><path d="M6 9l6 6 6-6" /></svg>
		</button>
	</div>
</template>

<script>
import SentenceWriteIcon from '@/components/Subjects/SubjectDisplay/SentenceWriteIcon.vue';
import {
	readPageHistory,
	readSentenceArchive,
	saveArchivedTranslation,
	saveSentenceTranslation,
	watchPageHistory,
	watchSentenceArchive,
} from '@/utils/scripts/pageHistory';
import { cleanSentence } from '@/utils/scripts/pageSentences';
import { canTranslateSentences, translateSentence } from '@/utils/scripts/sentenceTranslation';
import { sentenceWordReader } from '@/utils/scripts/sentenceWords';

const LIMIT = 4;

export default {
	name: 'SubjectDisplayReadingSentences',

	components: { SentenceWriteIcon },

	props: {
		item: { type: Object, required: true },
		/** in the extension (not on a web page): a link to the Sentences page */
		linkLibrary: Boolean,
	},

	/**
	 * `handwriting`: a sentence to see handwritten (the details' SentenceHandwriting);
	 * `content-changed`: other cards on screen (the details highlight them, as their other text)
	 */
	emits: ['handwriting', 'content-changed'],

	data() {
		return {
			entries: [],
			/** sentences of pages that left the history (pageHistory.ts) */
			archive: [],
			expanded: false,
			LIMIT,
			/** the browser translates on the device (else no button) */
			canTranslate: false,
			/** row key → true (translating), a 0–1 share (the model downloading), or 'failed' */
			translating: {},
			/** the words and unlearned kanji of a sentence (sentenceWords.ts; null until ready) */
			reader: null,
			/** translating the shown ones on its own was refused (the first download needs a click) */
			autoBlocked: false,
			autoRunning: false,
		};
	},

	watch: {
		// what's on screen (more opened, a translation saved, the translator found): translated on
		// its own, and highlighted (the details' highlighting ran before these cards were there)
		shown(rows) {
			void this.autoTranslate();
			// only other sentences (not a translation saved: the same ones, rebuilt)
			const keys = rows.map(row => row.key).join('\n');
			if (keys === this.shownKeys) return;
			this.shownKeys = keys;
			this.$nextTick(() => this.$emit('content-changed'));
		},
		canTranslate() {
			void this.autoTranslate();
		},
	},

	computed: {
		/**
		 * The sentences with this kanji / word, from the history and the archive (pages that left
		 * it); a sentence met on several pages, once. The easiest to read first (fewest kanji you
		 * haven't learned), then the newest.
		 */
		rows() {
			const characters = this.item.characters;
			if (!characters || this.item.type === 'radical') return [];
			// a word: the sentences with that word in them (話していました: 話す's, not 話's); a
			// kanji, or the words not read yet: those with its characters
			const isWord = this.item.type !== 'kanji';
			const byWords = isWord && this.reader;
			// quick first look: a conjugated word isn't written whole (話す in 話していました), its
			// first character is
			const mayHave = sentence => sentence.includes(byWords ? characters[0] : characters);
			const has = sentence => (byWords ? this.reader.words(sentence).has(characters) : true);
			// every sentence, as { sentence, translation, page… }: the history's, then the archive's
			const sources = [
				...this.entries.flatMap(entry => (entry.sentences ?? []).map(kept => {
					// without reference marks ("[19]"; ones kept before they were taken out)
					const sentence = cleanSentence(kept);
					return { sentence, translation: entry.translations?.[sentence] ?? '', url: entry.url, host: entry.host, title: entry.title, at: entry.at, archived: false };
				})),
				...this.archive.map(item => ({ ...item, translation: item.translation ?? '', archived: true })),
			];
			const seen = new Set();
			const rows = [];
			for (const source of sources) {
				const { sentence } = source;
				if (!sentence || !mayHave(sentence) || seen.has(sentence) || !has(sentence)) continue;
				seen.add(sentence);
				// marked by the details' highlighting, as the context sentences are
				rows.push({
					key: `${source.url}:${sentence}`,
					text: sentence,
					translation: source.translation,
					url: source.url,
					host: source.host,
					title: source.title || source.url,
					at: source.at,
					archived: source.archived,
					unknown: this.reader ? this.reader.unknownKanji(sentence) : 0,
				});
			}
			return rows.sort((a, b) => a.unknown - b.unknown || b.at - a.at);
		},
		shown() {
			return this.expanded ? this.rows : this.rows.slice(0, LIMIT);
		},
	},

	methods: {
		translateLabel(key) {
			const state = this.translating[key];
			if (state === 'failed') return 'Couldn\'t translate';
			if (typeof state === 'number') return `Getting the translator… ${Math.round(state * 100)}%`;
			return state ? 'Translating…' : 'Translate';
		},
		/**
		 * Translated on the device, kept with the sentence (shown from then on). `auto`: not
		 * clicked; failing then (no click for the first download) leaves the button to click.
		 * @returns whether it was translated
		 */
		async translate(row, { auto = false } = {}) {
			this.translating = { ...this.translating, [row.key]: true };
			try {
				const translation = await translateSentence(row.text, share => {
					this.translating = { ...this.translating, [row.key]: share };
				});
				if (!translation) throw new Error('empty');
				// done: not asked again while the saved one comes back from storage
				this.translatedKeys.add(row.key);
				// kept with the sentence: on its page, or in the archive
				if (row.archived) await saveArchivedTranslation(row.url, row.text, translation);
				else await saveSentenceTranslation(row.url, row.text, translation);
				const { [row.key]: _done, ...rest } = this.translating;
				this.translating = rest;
				// clicked: the others follow on their own
				if (!auto && this.autoBlocked) {
					this.autoBlocked = false;
					void this.autoTranslate();
				}
				return true;
			} catch {
				if (auto) {
					const { [row.key]: _left, ...rest } = this.translating;
					this.translating = rest;
					this.autoBlocked = true;
				} else {
					this.translating = { ...this.translating, [row.key]: 'failed' };
				}
				return false;
			}
		},
		/** The shown sentences without a translation, one at a time (the first may get the model). */
		async autoTranslate() {
			if (!this.canTranslate || this.autoBlocked || this.autoRunning) return;
			this.autoRunning = true;
			const waiting = () => this.shown.filter(row => !row.translation && !this.translating[row.key] && !this.translatedKeys.has(row.key));
			try {
				// again while more come into view meanwhile (e.g. "All" opened)
				for (let rows = waiting(); rows.length && !this.autoBlocked; rows = waiting()) {
					for (const row of rows) {
						if (!(await this.translate(row, { auto: true }))) break;
					}
				}
			} finally {
				this.autoRunning = false;
			}
		},
	},

	async created() {
		this.translatedKeys = new Set();
		void canTranslateSentences().then(can => { this.canTranslate = can; });
		// the words in the sentences: the rows follow once it's ready
		void sentenceWordReader().then(reader => { this.reader = reader; });
		try {
			[this.entries, this.archive] = await Promise.all([readPageHistory(), readSentenceArchive()]);
			this.unwatch = watchPageHistory(entries => { this.entries = entries; });
			this.unwatchArchive = watchSentenceArchive(items => { this.archive = items; });
		} catch {
			// no history here: nothing shown
		}
	},

	beforeUnmount() {
		this.unwatch?.();
		this.unwatchArchive?.();
	},
};
</script>

<style scoped>
/* the title, "All sentences ›" on its right */
.sd-readingSentences_head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.sd-readingSentences_all {
	flex-shrink: 0;
	font-size: 12px;
	font-weight: 700;
	color: var(--sd-muted, #999) !important;
	text-decoration: none;
}

.sd-readingSentences_all:hover {
	color: var(--sd-text, #fff) !important;
}

/* the card's edge: neutral (a colour there clashed with the highlight's), the text a bit off it */
.sd-detailsPopup .sd-detailsPopup_sentencesWrapper.sd-readingSentences {
	border-left-color: color-mix(in srgb, var(--sd-muted, #999) 55%, transparent);
}

.sd-detailsPopup .sd-readingSentences .sd-popupDetails_p > span {
	padding-left: 13px !important;
}

/* the muted line (where a context sentence has its English): the translation, then the page */
.sd-readingSentence_meta {
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.sd-readingSentence_translation {
	font-size: 13px;
	color: var(--sd-muted, #999);
}

/* "translated by machine": a tiny tag after the translation */
.sd-mtMark {
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
	white-space: nowrap;
	cursor: help;
}

/* drawn by CSS: as text, the highlighting would mark its 文 */
.sd-mtMark::after {
	content: '文A';
}

.sd-readingSentence_row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px 10px;
}

.sd-readingSentence_source {
	font-size: 12px;
	color: var(--sd-muted, #999) !important;
	text-decoration: none;
}

.sd-readingSentence_translate {
	padding: 1px 8px;
	border: 1px solid var(--sd-border, rgba(127, 127, 127, 0.3));
	border-radius: 999px;
	background: transparent;
	color: var(--sd-text, inherit);
	font-family: inherit;
	font-size: 11px;
	cursor: pointer;
	transition: background-color 0.15s;
}

.sd-readingSentence_translate:hover:not(:disabled) {
	background: rgba(255, 255, 255, 0.08);
}

.sd-readingSentence_translate:disabled {
	cursor: default;
	opacity: 0.75;
}

.sd-readingSentence_source:hover {
	text-decoration: underline;
}

/* "Show all N sentences": a bar as wide as the cards, as their surface, a chevron to its right */
.sd-readingSentences_more {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	width: 100%;
	margin-top: 8px;
	padding: 8px 12px;
	border: 1px dashed var(--sd-border, rgba(127, 127, 127, 0.35));
	border-radius: 8px;
	background: var(--sd-surface-sunken, rgba(0, 0, 0, 0.12));
	color: var(--sd-muted, #999);
	font-family: inherit;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
	transition: color 0.15s, border-color 0.15s, background-color 0.15s;
}

.sd-readingSentences_more:hover {
	color: var(--sd-text, #fff);
	border-style: solid;
}

.sd-readingSentences_more svg {
	width: 14px;
	height: 14px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2.5;
	stroke-linecap: round;
	stroke-linejoin: round;
	transition: transform 0.15s;
}

.sd-readingSentences_more svg.up {
	transform: rotate(180deg);
}
</style>
