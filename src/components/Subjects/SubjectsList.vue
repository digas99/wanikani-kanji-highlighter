<template>
	<SubjectListPanel
		ref="panel"
		class="subjects-list-wrapper"
		:header-title="showTitle ? headerTitle : ''"
		:sections="panelSections"
		:show-bar="showProgressionBar && groupedValues.length > 0"
		:menu-key="menuKey"
		:loading="loading || (valueCount > 0 && !groupedValues.length)"
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
import { srsStages } from '@/utils/scripts/wanikani';

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
		/** still loading: placeholders, not "nothing here" */
		loading: {
			type: Boolean,
			default: false,
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
			// stage to scroll to (from a clicked bar segment), kept until its section exists
			pendingJump: this.jumpSection,
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		/** subjects given, not grouped yet (grouping is async): still loading, not "nothing" */
		valueCount() {
			return Array.isArray(this.values) ? this.values.length : Object.keys(this.values ?? {}).length;
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
			// still loading: the count isn't known yet
			const count = this.loading ? '…' : (Array.isArray(this.values) ? this.values.length : 0);
			return `<b>${count}</b> Subjects on <b>${this.titleId ?? ''}</b>`;
		},
		/** `height` is sized for the 600px popup; taller windows (popped out, mobile) grow it. */
		panelHeightStyle() {
			return {
				'--subject-list-height': `max(${this.height}px, calc(100vh - ${600 - this.height}px))`,
			};
		},
	},

	async created() {
		this.groupedValues = await this.groupValues();
		if (this.showTitle) {
			this.titleId = await this.getTitleId();
		}
		this.tryPendingJump();
	},

	mounted() {
		this.$nextTick(() => {
			if (this.pendingJump) {
				this.tryPendingJump();
				return;
			}
			this.$refs.panel?.setScrollTop(this.wk.subjectsListScroll);
		});
	},

	watch: {
		values: {
			async handler() {
				this.groupedValues = await this.groupValues();
				// the same view is reused across levels / stages: keep the header in sync
				if (this.showTitle) this.titleId = await this.getTitleId();
				this.tryPendingJump();
			},
			deep: true,
		},
		jumpSection(sectionId) {
			if (!sectionId) return;
			this.pendingJump = sectionId;
			this.tryPendingJump();
		},
	},

	methods: {
		sectionLabel(id) {
			if (this.type !== 'level') {
				return `${String(id).charAt(0).toUpperCase()}${String(id).slice(1)}`;
			}
			// level lists fold Guru and above into stage 5
			if (String(id) === '5') return 'Passed';
			if (String(id) === '-1') return 'Locked';
			return srsStages[id]?.name ?? `Stage ${id}`;
		},
		async getTitleId() {
			switch (this.type) {
				case 'srs': {
					const { srsStages } = await import('@/utils/scripts/wanikani');
					return srsStages[this.id]?.name ?? null;
				}
				case 'legacy':
					return 'Legacy';
				case 'locked':
					return 'Locked';
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
				case 'srs':
				case 'legacy':
				case 'locked': {
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
			return this.$refs.panel?.scrollToSection(String(sectionId)) ?? false;
		},
		/**
		 * Sections are built asynchronously (and the list's data may still be loading),
		 * so retry the requested jump whenever the sections change, until it lands.
		 */
		tryPendingJump() {
			if (!this.pendingJump) return;
			this.$nextTick(() => requestAnimationFrame(() => {
				if (this.pendingJump && this.scrollToSection(this.pendingJump)) {
					this.pendingJump = null;
				}
			}));
		},
	},
};
</script>

<style scoped>
.subjects-list-wrapper {
	background-color: var(--default-color);
}
</style>
