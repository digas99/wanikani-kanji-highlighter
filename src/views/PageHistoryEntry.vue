<template>
	<div class="container page-entry">
		<template v-if="entry">
			<!-- the page: its badge, title and summary, as a card (not on the bare background) -->
			<div class="page-entry-card page-entry-section">
			<header class="page-entry-head">
				<span class="page-entry-level" :class="{ word: badge.text.length > 3 }" :style="{ background: badge.color }" :title="badge.title">{{ badge.text }}</span>
				<span class="page-entry-title">
					<a :href="entry.url" target="_blank" rel="noopener" :title="entry.url">{{ entry.title }} <span aria-hidden="true">↗</span></a>
					<small>{{ entry.host }} · {{ when }}</small>
				</span>
			</header>
			<p class="page-entry-summary">
				<b>{{ Math.round(entry.stats.learnedPercent) }}%</b> of {{ entry.stats.partial ? 'the chosen parts\'' : 'its' }} {{ entry.stats.total }} {{ noun }} learned ·
				<span :style="{ color: rating.color }">{{ rating.label }}</span>
				<small>{{ unitsText }}</small>
			</p>
			</div>

			<div class="page-entry-bars page-entry-section">
				<div class="page-entry-section-head">
					<span class="page-entry-section-title">Reading level</span>
					<span class="page-entry-section-hint">Pick one to group the list below</span>
				</div>
				<!-- each classification, a box of its own; the chosen one groups the list below -->
				<button
					v-for="row in rows"
					:key="row.id"
					type="button"
					class="page-entry-bar"
					:class="{ chosen: row.id === view }"
					:aria-pressed="row.id === view"
					:title="row.id === view ? 'The list below is grouped by this' : 'Group the list below by this'"
					@click="view = row.id"
				>
					<span class="page-entry-bar-head">
						<span class="page-entry-bar-label">{{ row.label }}</span>
						<span class="page-entry-bar-badge" :style="{ background: row.badge.color }" :title="row.badge.title">{{ row.badge.text }}</span>
					</span>
					<PageStatsSegments :segments="row.segments" :height="8" />
					<span class="page-entry-legend">
						<span v-for="segment in row.segments" :key="segment.key">
							<span class="page-entry-dot" :style="{ background: segment.color }"></span>{{ segment.label }} <b>{{ segment.count }}</b>
						</span>
					</span>
				</button>
			</div>

			<QueueSubjectsView
				:header-title="`<b>${entry.stats.total}</b> ${noun} ${entry.stats.partial ? 'in the chosen parts' : 'on this page'}`"
				:sections="sections"
				:height="300"
				:bar-sorting="barSorting"
				menu-key="pages"
				:empty-message="`Loading the ${noun}…`"
			/>
			<div v-if="entry.stats.other" class="page-entry-other page-entry-section">
				<div class="page-entry-section-head">
					<span class="page-entry-section-title">Not on WaniKani</span>
					<span class="page-entry-section-hint">{{ entry.stats.other.length }} kanji · open one on Jisho</span>
				</div>
				<p lang="ja">
					<a
						v-for="char in entry.stats.other"
						:key="char"
						class="page-entry-other-link"
						:href="jishoKanjiUrl(char)"
						target="_blank"
						rel="noopener noreferrer"
						:title="`${char} on Jisho`"
					>{{ char }}</a>
				</p>
			</div>

			<!-- the sentences kept from it (Keep example sentences): what's stored, to check and remove -->
			<div v-if="entry.sentences?.length" class="page-entry-sentences page-entry-section">
				<div class="page-entry-section-head">
					<span class="page-entry-section-title">Sentences kept</span>
					<span class="page-entry-section-hint">{{ entry.sentences.length }} from this page</span>
				</div>
				<!-- one card each, numbered, highlighted as on pages -->
				<ol ref="sentences" lang="ja" class="wkh-highlight-scope" :style="highlightVars" @click="openHighlighted">
					<li v-for="(sentence, index) in shownSentences" :key="sentence">
						<span class="page-entry-sentence-n" aria-hidden="true">{{ index + 1 }}</span>
						<span class="page-entry-sentence-body">
							<span class="page-entry-sentence-text">{{ sentence }}</span>
							<!-- its translation (asked for, on this device), or the button to ask -->
							<span v-if="entry.translations?.[sentence]" lang="en" class="page-entry-sentence-translation">
								{{ entry.translations[sentence] }}
								<!-- marked as a machine translation -->
								<span class="page-entry-mt" title="Machine translation, on this device" aria-label="Machine translation"></span>
							</span>
							<button
								v-else-if="canTranslate"
								type="button"
								lang="en"
								class="page-entry-sentence-translate"
								:disabled="Boolean(translating[sentence])"
								title="Translate to English, on this device (nothing is sent anywhere)"
								@click.stop="translate(sentence)"
							>{{ translateLabel(sentence) }}</button>
						</span>
					</li>
				</ol>
				<div class="page-entry-sentence-actions">
					<button type="button" class="page-entry-remove" @click="removeTheseSentences">Remove these sentences</button>
					<button type="button" class="page-entry-remove" :title="`Remove the sentences of every ${entry.host} page, and keep none from it again`" @click="excludeSite">Don't keep sentences from this site</button>
				</div>
			</div>

			<button type="button" class="page-entry-remove" @click="remove">Remove from the history</button>
		</template>
		<p v-else-if="loaded" class="page-entry-missing">This page isn't in the history anymore.</p>
	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import { useSettingsStore } from '@/stores/settings';
import QueueSubjectsView from '@/components/Queue/QueueSubjectsView.vue';
import PageStatsSegments from '@/components/PageStats/PageStatsSegments.vue';
import { storage } from '#imports';
import { readPageHistory, removePage, removeSentences, saveSentenceTranslation } from '@/utils/scripts/pageHistory';
import { canTranslateSentences, translateSentence } from '@/utils/scripts/sentenceTranslation';
import { cleanSentence, SENTENCE_EXCLUDED_SITES_KEY } from '@/utils/scripts/pageSentences';
import { highlightElement } from '@/utils/highlight/subjectDetailsHighlight';
import { HIGHLIGHT_MARK_CLASS, highlightValueOf } from '@/utils/highlight/highlighter';
import { highlightStyleVarsFromSettings, srsAppearanceVarsFromSettings } from '@/utils/highlight/highlightStyleVars';
import {
	barSegments,
	LEVEL_COLORS,
	PAGE_STATS_VIEWS,
	pageBadge,
	readingRating,
	resolvePageStatsView,
	unitsNoun,
	unitsText,
} from '@/utils/scripts/pageStats';
import { getSrsStageColor, SRS_STAGE_SECTIONS, srsStageKeyFromSubject } from '@/utils/highlight/srsStageHighlight';
import { JLPT_GRADE_SECTIONS, JOYO_GRADE_SECTIONS } from '@/utils/highlight/schoolGradeHighlight';
import { kanjiJlptGrade, kanjiJoyoGrade, vocabJlptGrade, vocabJoyoGrade } from '@/utils/scripts/vocabSchoolGrades';
import { notificationTime } from '@/utils/scripts/notifications';

/** Learned view: the ones to learn first. */
const LEARNED_ORDER = ['notLearned', 'learned'];

export default {
	name: 'PageHistoryEntry',

	components: {
		QueueSubjectsView,
		PageStatsSegments,
	},

	data() {
		return {
			entry: null,
			loaded: false,
			/** what groups the list (and the top badge): the classification setting, then a bar's click */
			view: resolvePageStatsView(useSettingsStore().settings),
			/** the page's kanji and words as subjects (from the cache), by "type:characters" */
			subjectsByKey: {},
			/** the browser translates on the device (else no button) */
			canTranslate: false,
			/** sentence → true (translating), a 0–1 share (the model downloading), or 'failed' */
			translating: {},
			/** translating them on its own was refused (the first download needs a click) */
			autoBlocked: false,
			autoRunning: false,
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		appearance() {
			return useSettingsStore().settings.appearance ?? {};
		},
		badge() {
			return pageBadge(this.entry.stats, this.view);
		},
		rating() {
			return readingRating(this.entry.stats.learnedPercent);
		},
		when() {
			return notificationTime(this.entry.at);
		},
		/** "kanji", or "words and kanji" (rated in Words / Mixed mode) */
		noun() {
			return unitsNoun(this.entry.stats);
		},
		unitsText() {
			return this.entry.stats.unit === 'words' ? `(${unitsText(this.entry.stats)})` : '';
		},
		rows() {
			return PAGE_STATS_VIEWS.map(view => ({
				...view,
				segments: barSegments(this.entry.stats, view.id, this.appearance),
				badge: pageBadge(this.entry.stats, view.id),
			}));
		},
		/**
		 * The page's words (Words / Mixed) and kanji as tiles, each with its group in the chosen
		 * view. Locked ones have no assignment (the queue lists' builder leaves those out).
		 */
		items() {
			const stats = this.entry.stats;
			const assignmentById = new Map(this.wk.assignments.map(assignment => [assignment.subject_id, assignment]));
			const learned = new Set([...stats.learned, ...(stats.learnedWords ?? [])]);
			const entries = [
				...[...(stats.learnedWords ?? []), ...(stats.notLearnedWords ?? [])].map(word => ({ value: word, word: true })),
				...[...stats.learned, ...stats.notLearned].map(char => ({ value: char, word: false })),
			];
			return entries.flatMap(({ value, word }) => {
				const subject = this.subjectsByKey[`${word ? 'vocabulary' : 'kanji'}:${value}`];
				if (!subject) return [];
				const assignment = assignmentById.get(subject.id);
				const item = {
					...subject,
					type: subject.type || subject.subject_type || 'kanji',
					assignment: assignment
						? { srs_stage: assignment.srs_stage, passed_at: assignment.passed_at, hidden: assignment.hidden }
						: subject.assignment,
				};
				return [{ item, group: this.groupOf(value, word, learned.has(value), item) }];
			});
		},
		/** The view's groups (the bar's segments: same names, colors and order). */
		sections() {
			const segments = barSegments(this.entry.stats, this.view, this.appearance).filter(segment => segment.key !== 'other');
			const order = this.view === 'learned' ? LEARNED_ORDER : segments.map(segment => segment.key);
			const byKey = new Map(segments.map(segment => [segment.key, segment]));
			// groups the list has that the saved counts don't (a stage that changed since)
			for (const { group } of this.items) if (!order.includes(group)) order.push(group);
			return order
				.map(key => ({
					id: key,
					label: key === 'notLearned' ? 'Not learned yet' : byKey.get(key)?.label ?? this.groupLabel(key),
					color: byKey.get(key)?.color ?? this.groupColor(key),
					items: this.items.filter(entry => entry.group === key).map(entry => entry.item),
				}))
				.filter(section => section.items.length);
		},
		barSorting() {
			return Object.fromEntries(this.sections.map((section, index) => [section.id, index]));
		},
		/** the highlight's colors (Settings → Theme), as the subject details have them */
		highlightVars() {
			const settings = useSettingsStore().settings;
			return { ...highlightStyleVarsFromSettings(settings), ...srsAppearanceVarsFromSettings(settings) };
		},
		/** without reference marks ("[19]"; ones kept before they were taken out) */
		shownSentences() {
			return [...new Set((this.entry?.sentences ?? []).map(cleanSentence).filter(Boolean))];
		},
	},

	watch: {
		// the sentences shown (or changed): highlighted as the page's text is
		shownSentences: {
			handler() {
				this.$nextTick(() => void highlightElement(this.$refs.sentences));
				void this.autoTranslate();
			},
		},
		// the translator found: the sentences translated on their own
		canTranslate() {
			void this.autoTranslate();
		},
	},

	async created() {
		this.translatedSentences = new Set();
		void canTranslateSentences().then(can => { this.canTranslate = can; });
		if (!this.wk.assignments.length) void this.wk.loadDashboardFromCache();
		const url = String(this.$route.query.url ?? '');
		this.entry = (await readPageHistory()).find(entry => entry.url === url) ?? null;
		this.loaded = true;
		if (!this.entry) return;
		const { learned, notLearned, learnedWords = [], notLearnedWords = [] } = this.entry.stats;
		const [kanji, words] = await Promise.all([
			this.wk.getHighlightedSubjects([...learned, ...notLearned].map(value => ({ value, type: 'kanji' }))),
			this.wk.getHighlightedSubjects([...learnedWords, ...notLearnedWords].map(value => ({ value, type: 'vocabulary' }))),
		]);
		this.subjectsByKey = Object.fromEntries([
			...kanji.map(subject => [`kanji:${subject.characters}`, subject]),
			...words.map(subject => [`vocabulary:${subject.characters}`, subject]),
		]);
	},

	methods: {
		/** The kanji's page on Jisho (its details: readings, meanings, strokes). */
		jishoKanjiUrl(char) {
			return `https://jisho.org/search/${encodeURIComponent(`${char} #kanji`)}`;
		},

		/** A word's / kanji's group in the chosen view (as the bar counts them; SRS: its stage now). */
		groupOf(value, word, isLearned, item) {
			if (this.view === 'learned') return isLearned ? 'learned' : 'notLearned';
			if (this.view === 'srs') return srsStageKeyFromSubject(item);
			if (this.view === 'jlpt') return (word ? vocabJlptGrade(value) : kanjiJlptGrade(value)) ?? 'none';
			return (word ? vocabJoyoGrade(value) : kanjiJoyoGrade(value)) ?? 'none';
		},
		groupLabel(key) {
			const sections = this.view === 'srs' ? SRS_STAGE_SECTIONS : this.view === 'jlpt' ? JLPT_GRADE_SECTIONS : JOYO_GRADE_SECTIONS;
			return sections.find(section => section.key === key)?.label ?? (this.view === 'jlpt' ? 'Not in the JLPT' : 'Not Jōyō');
		},
		groupColor(key) {
			if (this.view === 'srs') return getSrsStageColor(key, this.appearance);
			const section = (this.view === 'jlpt' ? JLPT_GRADE_SECTIONS : JOYO_GRADE_SECTIONS).find(entry => entry.key === key);
			if (!section) return '#5c5f73';
			return this.view === 'jlpt' ? LEVEL_COLORS[section.label] : section.fallbackColor;
		},
		async remove() {
			await removePage(this.entry.url);
			this.$router.back();
		},
		/** A highlighted kanji / word in a sentence: its subject's page (as in the subject details). */
		async openHighlighted(event) {
			const span = event.target instanceof Element ? event.target.closest(`span.${HIGHLIGHT_MARK_CLASS}`) : null;
			// a conjugated word: the word it is (話して → 話す)
			const value = span ? highlightValueOf(span) : '';
			if (!value) return;
			const [subject] = await this.wk.getHighlightedSubjects([{ value, type: span.getAttribute('data-wkh-type') ?? undefined }]);
			if (subject?.id != null) this.$router.push({ name: 'Subject', params: { id: subject.id } });
		},
		translateLabel(sentence) {
			const state = this.translating[sentence];
			if (state === 'failed') return 'Couldn\'t translate';
			if (typeof state === 'number') return `Getting the translator… ${Math.round(state * 100)}%`;
			return state ? 'Translating…' : 'Translate';
		},
		/**
		 * Translated on the device, kept with the sentence (shown from then on). `auto`: not
		 * clicked; failing then (no click for the first download) leaves the button to click.
		 * @returns whether it was translated
		 */
		async translate(sentence, { auto = false } = {}) {
			const url = this.entry.url;
			this.translating = { ...this.translating, [sentence]: true };
			try {
				const translation = await translateSentence(sentence, share => {
					this.translating = { ...this.translating, [sentence]: share };
				});
				if (!translation) throw new Error('empty');
				// done: never asked again on this visit
				this.translatedSentences.add(sentence);
				await saveSentenceTranslation(url, sentence, translation);
				this.entry =(await readPageHistory()).find(entry => entry.url === url) ?? this.entry;
				const { [sentence]: _done, ...rest } = this.translating;
				this.translating = rest;
				// clicked: the others follow on their own
				if (!auto && this.autoBlocked) {
					this.autoBlocked = false;
					void this.autoTranslate();
				}
				return true;
			} catch {
				if (auto) {
					const { [sentence]: _left, ...rest } = this.translating;
					this.translating = rest;
					this.autoBlocked = true;
				} else {
					this.translating = { ...this.translating, [sentence]: 'failed' };
				}
				return false;
			}
		},
		/** The sentences without a translation, one at a time (the first may get the model). */
		async autoTranslate() {
			if (!this.canTranslate || this.autoBlocked || this.autoRunning || !this.entry) return;
			this.autoRunning = true;
			const waiting = () => this.shownSentences.filter(sentence => !this.entry?.translations?.[sentence]
				&& !this.translating[sentence] && !this.translatedSentences.has(sentence));
			try {
				for (let sentences = waiting(); sentences.length && !this.autoBlocked; sentences = waiting()) {
					for (const sentence of sentences) {
						if (!(await this.translate(sentence, { auto: true }))) break;
					}
				}
			} finally {
				this.autoRunning = false;
			}
		},
		/** this page's sentences only (the page stays) */
		async removeTheseSentences() {
			const url = this.entry.url;
			await removeSentences(undefined, url);
			this.entry = (await readPageHistory()).find(entry => entry.url === url) ?? null;
		},
		/** none from this site again (Settings lists it), and those kept removed */
		async excludeSite() {
			const host = this.entry.host;
			const sites = (await storage.getItem(SENTENCE_EXCLUDED_SITES_KEY)) ?? [];
			if (!sites.includes(host)) await storage.setItem(SENTENCE_EXCLUDED_SITES_KEY, [...sites, host]);
			await removeSentences([host]);
			this.entry = (await readPageHistory()).find(entry => entry.url === this.entry.url) ?? null;
		},
	},
};
</script>

<style scoped>
.page-entry {
	display: flex;
	flex-direction: column;
	gap: 14px;
	padding-top: 12px;
	padding-bottom: 20px;
	background-color: var(--default-color);
	color: #fff;
}

/* each part a card of its own: a surface off the background, edged, a little shadow */
.page-entry-section {
	padding: 12px;
	border: 1px solid rgba(255, 255, 255, 0.09);
	border-radius: 12px;
	background: rgba(255, 255, 255, 0.05);
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
}

/* its title, as the other pages' cards (a pill), and a hint on the right */
.page-entry-section-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin-bottom: 10px;
}

.page-entry-section-title {
	padding: 3px 10px;
	border-radius: 999px;
	background: var(--pill-color, #e36f94);
	color: #fff;
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 0.04em;
	line-height: 1.4;
	text-transform: uppercase;
}

.page-entry-section-hint {
	font-size: 11px;
	color: #9a9db4;
	text-align: right;
}

/* the page's card: its summary under a line */
.page-entry-card {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.page-entry-head {
	display: flex;
	align-items: center;
	gap: 10px;
}

.page-entry-level {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 46px;
	height: 46px;
	border-radius: 10px;
	font-size: 16px;
	font-weight: 800;
}

/* a reading ease (Comfortable…) instead of a level */
.page-entry-level.word {
	width: 84px;
	font-size: 11px;
}

.page-entry-title {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.page-entry-title a {
	color: #fff;
	font-size: 14px;
	font-weight: 700;
	line-height: 1.35;
}

.page-entry-title small {
	font-size: 11px;
	color: #b3b6cc;
}

.page-entry-summary {
	padding-top: 10px;
	border-top: 1px solid rgba(255, 255, 255, 0.08);
	font-size: 13px;
	color: #c4c6da;
}

.page-entry-summary b {
	color: #fff;
}

.page-entry-summary small {
	margin-left: 4px;
	font-size: 11.5px;
	color: #9a9db4;
}

.page-entry-bars {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.page-entry-bars .page-entry-section-head {
	margin-bottom: 2px;
}

/* a classification, in a box of its own: click to group the list by it */
.page-entry-bar {
	display: flex;
	flex-direction: column;
	gap: 6px;
	width: 100%;
	padding: 9px 10px;
	box-sizing: border-box;
	border: 1px solid rgba(255, 255, 255, 0.07);
	border-radius: 9px;
	background: rgba(0, 0, 0, 0.14);
	color: inherit;
	font-family: inherit;
	text-align: left;
	cursor: pointer;
	transition: background-color 0.15s, border-color 0.15s;
}

.page-entry-bar:hover {
	background: rgba(255, 255, 255, 0.04);
}

.page-entry-bar.chosen {
	border-color: #e36f94;
	background: rgba(227, 111, 148, 0.12);
}

.page-entry-bar-head {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.page-entry-bar-badge {
	padding: 1px 7px;
	border-radius: 5px;
	font-size: 10.5px;
	font-weight: 800;
	color: #fff;
}

.page-entry-bar-label {
	font-size: 11px;
	font-weight: 800;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: #aeb1c6;
}

.page-entry-legend {
	display: flex;
	flex-wrap: wrap;
	gap: 2px 11px;
	font-size: 11px;
	color: #a9acc2;
}

/* the count stands out from its label */
.page-entry-legend b {
	margin-left: 1px;
	font-weight: 800;
	color: #fff;
}

.page-entry-dot {
	display: inline-block;
	width: 8px;
	height: 8px;
	margin-right: 4px;
	border-radius: 2px;
}

.page-entry-other p {
	font-size: 20px;
	letter-spacing: 0.15em;
	word-break: break-all;
}

.page-entry-other-link {
	color: inherit;
	text-decoration: none;
	border-radius: 4px;
}

.page-entry-other-link:hover {
	color: var(--wanikani-sec, #00aaff);
	background: rgba(255, 255, 255, 0.08);
}

.page-entry-remove {
	align-self: center;
	padding: 6px 12px;
	border: 1px solid rgba(255, 255, 255, 0.18);
	border-radius: 8px;
	background: transparent;
	color: #c4c6da;
	font-family: inherit;
	font-size: 12px;
	cursor: pointer;
}

.page-entry-sentences ol {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin: 0 0 10px;
	padding: 0;
	list-style: none;
}

/* a box per sentence (as the classifications'): its number in a small badge, the text beside it */
.page-entry-sentences li {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 9px 12px 9px 9px;
	border: 1px solid rgba(255, 255, 255, 0.07);
	border-radius: 9px;
	background: rgba(0, 0, 0, 0.14);
}

.page-entry-sentence-n {
	flex-shrink: 0;
	width: 20px;
	height: 20px;
	margin-top: 3px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 6px;
	background: rgba(255, 255, 255, 0.1);
	color: #aeb1c6;
	font-size: 10.5px;
	font-weight: 800;
	font-variant-numeric: tabular-nums;
}

.page-entry-sentence-body {
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 3px;
}

.page-entry-sentence-text {
	font-size: 15px;
	line-height: 1.75;
	color: #eceef6;
}

.page-entry-sentence-translation {
	font-size: 12.5px;
	line-height: 1.45;
	color: #a9acc2;
}

/* "translated by machine": a tiny tag after the translation */
.page-entry-mt {
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
.page-entry-mt::after {
	content: '文A';
}

.page-entry-sentence-translate {
	padding: 1px 8px;
	border: 1px solid rgba(255, 255, 255, 0.18);
	border-radius: 999px;
	background: transparent;
	color: #c4c6da;
	font-family: inherit;
	font-size: 11px;
	cursor: pointer;
}

.page-entry-sentence-translate:hover:not(:disabled) {
	background: rgba(255, 255, 255, 0.08);
}

.page-entry-sentence-translate:disabled {
	cursor: default;
	opacity: 0.75;
}

/* a highlighted kanji / word opens its subject */
.page-entry-sentences :deep(span.wkhighlighter_clickable) {
	cursor: pointer;
	transition: opacity 0.15s;
}

.page-entry-sentences :deep(span.wkhighlighter_clickable:hover) {
	opacity: 0.8;
}

.page-entry-sentence-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.page-entry-missing {
	padding: 40px 16px;
	text-align: center;
	color: #b3b6cc;
}
</style>
