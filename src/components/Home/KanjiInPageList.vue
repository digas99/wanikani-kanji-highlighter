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

function subjectHighlightKey(subject) {
	const type = subject.type === 'kanji' ? 'kanji' : 'vocabulary';
	return `${type}:${subject.characters}`;
}

export default {
	name: 'KanjiInPageList',

	components: {
		ProgressionBar,
		SubjectListPanel,
	},

	emits: ['highlight-summary'],

	data() {
		return {
			subjects: [],
			highlightItems: [],
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
				this.subjects = await this.wk.getHighlightedSubjects(items);
			} catch {
				// No content script on this page (restricted URL, blacklisted, or not yet injected).
				this.highlightItems = [];
				this.subjects = [];
			}
		},
	},
};
</script>

<style scoped>
.kanji-list :deep(.panel-content) {
	border-radius: 0;
	padding: 0;
}

.kanji-list :deep(.panel-bar) {
	padding: 8px 10px 6px;
}

.kanji-list :deep(.panel-sections) {
	max-height: 260px;
	padding: 0 5px 5px;
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
