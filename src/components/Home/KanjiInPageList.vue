<template>
	<div v-if="show" id="highlighted-kanji-list" class="kanji-list">
		<SubjectListPanel
			ref="panel"
			:header-title="panelHeaderTitle"
			:sections="sections"
			:show-bar="showProgressBar"
			menu-key="highlighted"
			empty-message="Nothing highlighted on this page"
		>
			<!-- the pages history, on the header's right (no row of its own under the list) -->
			<template v-if="pageHistoryOn" #header-end>
				<RouterLink :to="{ name: 'Pages' }" class="kanji-list-header-link" title="The pages you read before, with their reading level">
					Pages read ›
				</RouterLink>
			</template>
			<template #bar>
				<ProgressionBar
					:values="barValues"
					:colors="barColors"
					:sorting="barSorting"
					scroll-to-sections
					@section-select="scrollToSection"
				/>
			</template>
		</SubjectListPanel>
		<!-- the pages read before (Settings → Page reading level → Keep a history);
		     nothing highlighted here: the last few of them -->
		<div v-if="showRecent" class="kanji-list-recent">
			<!-- the link to all of them in the box's own header (no extra row under it) -->
			<div class="kanji-list-recent-head">
				<span class="kanji-list-recent-title">Recently read</span>
				<RouterLink :to="{ name: 'Pages' }" class="kanji-list-recent-all">All pages read ›</RouterLink>
			</div>
			<PageHistoryRow
				v-for="entry in recentPages"
				:key="entry.url"
				:entry="entry"
				:view="pageStatsView"
				:appearance="settings.settings.appearance"
				:to="{ name: 'Page', query: { url: entry.url } }"
			/>
		</div>
		<!-- nothing highlighted and no recent pages yet: the link under the empty list -->
		<RouterLink v-if="pageHistoryOn && !showRecent && !highlightItems.length" :to="{ name: 'Pages' }" class="kanji-list-history">
			All pages read ›
		</RouterLink>
	</div>
</template>

<script>
import { browser } from 'wxt/browser';
import { useSettingsStore } from '@/stores/settings';
import { useWKStore } from '@/stores';
import { typeColors } from '@/utils/scripts/wanikani';
import { getActiveBrowserTab } from '@/utils/scripts/activeBrowserTab';
import {
	getSrsStageColor,
	SRS_STAGE_SECTIONS,
	srsStageKeyFromItem,
	srsStageKeyFromSubject,
} from '@/utils/highlight/srsStageHighlight';
import {
	getSchoolGradeColor,
	gradeKeyFromSubject,
	JLPT_GRADE_SECTIONS,
	JOYO_GRADE_SECTIONS,
} from '@/utils/highlight/schoolGradeHighlight';
import ProgressionBar from '@/components/Home/ProgressionBar.vue';
import SubjectListPanel from '@/components/Subjects/SubjectListPanel.vue';
import { getHighlightModeLabel } from '@/utils/scripts/defaultSettings';
import PageHistoryRow from '@/components/PageStats/PageHistoryRow.vue';
import { readPageHistory } from '@/utils/scripts/pageHistory';
import { resolvePageStatsView } from '@/utils/scripts/pageStats';

const RECENT_PAGES = 3;

function subjectHighlightKey(subject) {
	const type = subject.type === 'kanji' ? 'kanji' : 'vocabulary';
	return `${type}:${subject.characters}`;
}

export default {
	name: 'KanjiInPageList',

	components: {
		ProgressionBar,
		SubjectListPanel,
		PageHistoryRow,
	},

	emits: ['highlight-summary'],

	data() {
		return {
			subjects: [],
			/** the page's subjects are being read from the cache (the notice's bar waits for them) */
			subjectsLoading: false,
			highlightItems: [],
			/** the last pages of the history (shown when nothing is highlighted here) */
			recentPages: [],
		};
	},

	computed: {
		settings() {
			return useSettingsStore();
		},
		wk() {
			return useWKStore();
		},
		show() {
			return this.settings.settings.extension_popup_interface.highlighted_kanji !== false;
		},
		pageHistoryOn() {
			return this.settings.settings.page_stats?.history === true;
		},
		/** nothing highlighted here: the last pages read instead */
		showRecent() {
			return this.pageHistoryOn && !this.highlightItems.length && this.recentPages.length > 0;
		},
		pageStatsView() {
			return resolvePageStatsView(this.settings.settings);
		},
		highlightCount() {
			return this.highlightItems.length;
		},
		highlightTarget() {
			const target = this.settings.settings.highlighter?.target;
			if (target === 'vocabulary' || target === 'mixed') return target;
			return 'kanji';
		},
		highlightColorBy() {
			const colorBy = this.settings.settings.highlighter?.color_by;
			if (colorBy === 'srs_stage' || colorBy === 'jlpt' || colorBy === 'joyo') return colorBy;
			return 'learned';
		},
		panelHeaderTitle() {
			if (!this.subjects.length) return '';
			return `<b>${this.subjects.length}</b> Highlighted on this page`;
		},
		showProgressBar() {
			return this.sections.length > 1;
		},
		barValues() {
			return this.sections.map(section => ({
				id: section.sectionId,
				items: section.subjects,
			}));
		},
		barColors() {
			return Object.fromEntries(
				this.sections.map(section => [section.sectionId, section.accentColor]),
			);
		},
		barSorting() {
			return Object.fromEntries(
				this.sections.map((section, index) => [section.sectionId, index]),
			);
		},
		highlightSummary() {
			return {
				count: this.highlightCount,
				showProgressBar: this.showProgressBar,
				barLoading: this.subjectsLoading,
				barValues: this.barValues,
				barColors: this.barColors,
				barSorting: this.barSorting,
				modeLabel: getHighlightModeLabel(this.highlightTarget, this.highlightColorBy),
			};
		},
		sections() {
			if (!this.subjects.length) return [];

			const appearance = this.settings.settings.appearance ?? {};
			const itemByKey = new Map(
				this.highlightItems.map(item => [`${item.type}:${item.value}`, item]),
			);

			const getMeta = subject => itemByKey.get(subjectHighlightKey(subject));

			if (this.highlightColorBy === 'srs_stage') {
				const buckets = Object.fromEntries(
					SRS_STAGE_SECTIONS.map(section => [section.key, []]),
				);

				for (const subject of this.subjects) {
					const meta = getMeta(subject);
					const stageKey = meta ? srsStageKeyFromItem(meta) : srsStageKeyFromSubject(subject);
					buckets[stageKey].push(subject);
				}

				return SRS_STAGE_SECTIONS
					.map((section, index) => ({
						sectionId: `highlighted-srs-${section.key}`,
						menuKey: 'highlighted',
						label: section.label,
						countLabel: `(${buckets[section.key].length})`,
						subjects: buckets[section.key],
						accentColor: getSrsStageColor(section.key, appearance),
						headerVariant: 'compact',
						showControls: index === 0,
					}))
					.filter(section => section.subjects.length > 0);
			}

			if (this.highlightColorBy === 'jlpt' || this.highlightColorBy === 'joyo') {
				const sections = this.highlightColorBy === 'jlpt'
					? JLPT_GRADE_SECTIONS
					: JOYO_GRADE_SECTIONS;
				const buckets = Object.fromEntries(
					sections.map(section => [section.key, []]),
				);

				for (const subject of this.subjects) {
					const meta = getMeta(subject);
					const gradeKey = meta?.schoolGrade
						?? gradeKeyFromSubject(subject, this.highlightColorBy);
					if (!gradeKey || !buckets[gradeKey]) continue;
					buckets[gradeKey].push(subject);
				}

				return sections
					.map((section, index) => {
						const sectionSubjects = buckets[section.key];
						return {
							sectionId: `highlighted-${this.highlightColorBy}-${section.key}`,
							menuKey: 'highlighted',
							label: section.label,
							countLabel: `(${sectionSubjects.length})`,
							subjects: sectionSubjects,
							accentColor: getSchoolGradeColor(section.key, sections),
							headerVariant: 'compact',
							showControls: index === 0,
						};
					})
					.filter(section => section.subjects.length > 0);
			}

			if (this.highlightTarget === 'mixed') {
				const kanji = [];
				const vocabulary = [];

				for (const subject of this.subjects) {
					const meta = getMeta(subject);
					const bucket = (meta?.type ?? (subject.type === 'kanji' ? 'kanji' : 'vocabulary')) === 'kanji'
						? kanji
						: vocabulary;
					bucket.push(subject);
				}

				return [
					{
						sectionId: 'highlighted-kanji',
						menuKey: 'highlighted',
						label: 'Kanji',
						countLabel: `(${kanji.length})`,
						subjects: kanji,
						accentColor: typeColors.kanji,
						headerVariant: 'compact',
						showControls: true,
					},
					{
						sectionId: 'highlighted-vocabulary',
						menuKey: 'highlighted',
						label: 'Vocabulary',
						countLabel: `(${vocabulary.length})`,
						subjects: vocabulary,
						accentColor: typeColors.vocabulary,
						headerVariant: 'compact',
						showControls: false,
					},
				].filter(section => section.subjects.length > 0);
			}

			const learned = [];
			const notLearned = [];

			for (const subject of this.subjects) {
				const meta = getMeta(subject);
				(meta?.learned ? learned : notLearned).push(subject);
			}

			return [
				{
					sectionId: 'highlighted-learned',
					menuKey: 'highlighted',
					label: 'Learned',
					countLabel: `(${learned.length})`,
					subjects: learned,
					accentColor: appearance.highlight_learned || '#00aaff',
					headerVariant: 'compact',
					showControls: true,
				},
				{
					sectionId: 'highlighted-not-learned',
					menuKey: 'highlighted',
					label: 'Not learned',
					countLabel: `(${notLearned.length})`,
					subjects: notLearned,
					accentColor: appearance.highlight_not_learned || '#f100a1',
					headerVariant: 'compact',
					showControls: false,
				},
			].filter(section => section.subjects.length > 0);
		},
	},

	watch: {
		highlightSummary: {
			handler(summary) {
				this.$emit('highlight-summary', summary);
			},
			deep: true,
			immediate: true,
		},
	},

	mounted() {
		this.fetchHighlighted();
		if (this.pageHistoryOn) {
			void readPageHistory().then(entries => { this.recentPages = entries.slice(0, RECENT_PAGES); });
		}
	},

	activated() {
		this.fetchHighlighted();
	},

	methods: {
		scrollToSection(sectionId) {
			this.$refs.panel?.scrollToSection(sectionId);
		},

		async fetchHighlighted() {
			try {
				const tab = await getActiveBrowserTab();
				const tabId = tab?.id;
				if (tabId == null) {
					this.highlightItems = [];
					this.subjects = [];
					return;
				}

				const response = await browser.tabs.sendMessage(tabId, { type: 'wkh:getKanji' });
				const items = response && Array.isArray(response.items) ? response.items : [];
				this.highlightItems = items;
				if (!items.length) {
					this.subjects = [];
					return;
				}
				// the count is known; the subjects (for the bar) take a moment from the cache
				this.subjectsLoading = true;
				this.subjects = await this.wk.getHighlightedSubjects(items);
			} catch {
				// No content script on this page (restricted URL, blacklisted, or not yet injected).
				this.highlightItems = [];
				this.subjects = [];
			} finally {
				this.subjectsLoading = false;
			}
		},
	},
};
</script>

<style scoped>
/* the history's rows are made for the navy pages: a navy box, light or dark theme */
.kanji-list-recent {
	display: flex;
	flex-direction: column;
	gap: 6px;
	/* the card's last thing: the same space below as on its sides */
	margin: 0 10px 10px;
	padding: 10px;
	border-radius: 12px;
	background-color: var(--default-color);
	background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0));
}

.kanji-list-header-link {
	color: var(--pill-color, #e36f94);
	white-space: nowrap;
}

.kanji-list-header-link:hover {
	opacity: 1;
	text-decoration: underline;
}

.kanji-list-recent-head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 10px;
}

.kanji-list-recent-all {
	font-size: 11.5px;
	font-weight: 700;
	color: var(--pill-color, #e36f94);
	white-space: nowrap;
}

.kanji-list-recent-all:hover {
	opacity: 1;
	text-decoration: underline;
}

.kanji-list-recent-title {
	font-size: 10.5px;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #c4c6da;
}

/* a footer of its own: the list above scrolls (and is cut mid-row) */
.kanji-list-history {
	display: block;
	padding: 9px 14px;
	border-top: 1px solid var(--row-border-color, rgba(0, 0, 0, 0.08));
	text-align: right;
	font-size: 12px;
	font-weight: 700;
	color: var(--pill-color, #e36f94);
}

.kanji-list :deep(.panel-content) {
	border-radius: 0;
	padding: 0;
}

.kanji-list :deep(.panel-bar) {
	padding: 8px 10px 6px;
}

.kanji-list :deep(.panel-sections) {
	max-height: 260px;
	padding: 0 8px 8px;
}

.kanji-list-recent + .kanji-list-history {
	/* below the recent pages' box: no line needed */
	margin-top: 4px;
	border-top: none;
}

.kanji-list :deep(.panel-header) {
	padding: 9px 14px;
	font-size: 13px;
	font-weight: bold;
}

.kanji-list :deep(#progression-bar) {
	padding-bottom: 0;
}
</style>
