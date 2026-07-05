<template>
	<SubjectListPanel
		ref="panel"
		class="subjects-list-wrapper"
		:header-title="showTitle ? headerTitle : ''"
		:sections="panelSections"
		:show-bar="showProgressionBar && groupedValues.length > 0"
		:menu-key="menuKey"
		:style="panelHeightStyle"
		@scroll="saveScroll"
	>
		<template #bar>
			<ProgressionBar
				:values="groupedValues"
				:colors="colors"
				:sorting="sorting"
				scroll-to-sections
				@section-select="scrollToSection"
			/>
		</template>
	</SubjectListPanel>
</template>

<script>
import ProgressionBar from '@/components/Home/ProgressionBar.vue';
import SubjectListPanel from '@/components/Subjects/SubjectListPanel.vue';
import { useWKStore } from '@/stores/index';

const LEVEL_TYPE_LABELS = {
	radical: 'Radicals',
	kanji: 'Kanji',
	vocabulary: 'Vocabulary',
};

export default {
	name: 'SubjectsList',

	components: {
		ProgressionBar,
		SubjectListPanel,
	},

	props: {
		values: {
			type: [Array, Object],
			default: () => [],
		},
		colors: {
			type: Object,
			default: () => ({}),
		},
		sorting: {
			type: Object,
			default: () => ({}),
		},
		id: {
			type: Number,
			default: null,
		},
		type: {
			type: String,
			default: '',
		},
		jumpSection: {
			type: String,
			default: null,
		},
		showTitle: {
			type: Boolean,
			default: true,
		},
		showProgressionBar: {
			type: Boolean,
			default: true,
		},
		height: {
			type: Number,
			default: 475,
		},
		menuKey: {
			type: String,
			default: 'subjects',
		},
	},

	data() {
		return {
			groupedValues: [],
			titleId: null,
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		panelSections() {
			return this.groupedValues.map(({ id, items }) => ({
				sectionId: String(id),
				label: this.sectionLabel(id),
				countLabel: `(${items.length})`,
				subjects: items,
				accentColor: this.colors?.[id] ?? '',
				headerVariant: 'compact',
			}));
		},
		headerTitle() {
			const count = Array.isArray(this.values) ? this.values.length : 0;
			return `<b>${count}</b> Subjects on <b>${this.titleId ?? ''}</b>`;
		},
		panelHeightStyle() {
			return {
				'--subject-list-height': `${this.height}px`,
			};
		},
	},

	async created() {
		this.groupedValues = await this.groupValues();
		if (this.showTitle) {
			this.titleId = await this.getTitleId();
		}
	},

	mounted() {
		this.$nextTick(() => {
			if (this.jumpSection) {
				this.scrollToSection(this.jumpSection);
				return;
			}
			this.$refs.panel?.setScrollTop(this.wk.subjectsListScroll);
		});
	},

	watch: {
		values: {
			async handler() {
				this.groupedValues = await this.groupValues();
			},
			deep: true,
		},
		jumpSection(sectionId) {
			if (!sectionId) return;
			this.$nextTick(() => this.scrollToSection(sectionId));
		},
	},

	methods: {
		sectionLabel(id) {
			if (this.type !== 'level') {
				return `${String(id).charAt(0).toUpperCase()}${String(id).slice(1)}`;
			}
			if (String(id) === '5') return 'Passed';
			if (String(id) === '-1') return 'Locked';
			return `Stage ${id}`;
		},
		async getTitleId() {
			switch (this.type) {
				case 'srs': {
					const { srsStages } = await import('@/utils/scripts/wanikani');
					return srsStages[this.id]?.name ?? null;
				}
				case 'level': {
					const level = this.$route.query.level;
					const subjectType = this.$route.query.subjectType;
					const typeLabel = LEVEL_TYPE_LABELS[subjectType] || subjectType || 'Subjects';
					return `Level ${level} ${typeLabel}`;
				}
			}
			return null;
		},
		async groupValues() {
			switch (this.type) {
				case 'srs': {
					const { groupByType } = await import('@/utils/scripts/common');
					return groupByType(this.values.map(item => ({
						...item,
						subject_type: item.type || item.subject_type,
					})));
				}
				case 'level': {
					const { groupBySRSStage } = await import('@/utils/scripts/common');
					const grouped = groupBySRSStage(this.values.map(item => ({
						...item,
						srs_stage: item.srs_stage ?? item.assignment?.srs_stage,
					})));
					if (this.sorting && Object.keys(this.sorting).length) {
						return grouped.sort((a, b) =>
							(this.sorting[a.id] ?? 0) - (this.sorting[b.id] ?? 0),
						);
					}
					return grouped.sort((a, b) => Number(a.id) - Number(b.id));
				}
			}
			return this.values;
		},
		saveScroll(scrollTop) {
			this.wk.subjectsListScroll = scrollTop;
		},

		scrollToSection(sectionId) {
			this.$refs.panel?.scrollToSection(String(sectionId));
		},
	},
};
</script>

<style scoped>
.subjects-list-wrapper {
	background-color: var(--default-color);
}
</style>
