<template>
	<SubjectListPanel
		ref="panel"
		class="queue-subjects"
		:header-title="headerTitle"
		:sections="listSections"
		:show-bar="showBar && barValues.length > 0"
		:menu-key="menuKey"
		:empty-message="emptyMessage"
		:loading="isLoading"
		:style="panelHeightStyle"
	>
		<template v-if="$slots['header-end']" #header-end>
			<slot name="header-end"></slot>
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
</template>

<script>
import ProgressionBar from '@/components/Home/ProgressionBar.vue';
import { useWKStore } from '@/stores';
import SubjectListPanel from '@/components/Subjects/SubjectListPanel.vue';
import { buildBarValues, sectionTileColors } from '@/utils/scripts/queueSubjects';

export default {
	name: 'QueueSubjectsView',

	components: {
		ProgressionBar,
		SubjectListPanel,
	},

	props: {
		headerTitle: {
			type: String,
			default: '',
		},
		sections: {
			type: Array,
			default: () => [],
		},
		height: {
			type: Number,
			default: 250,
		},
		showBar: {
			type: Boolean,
			default: true,
		},
		barSorting: {
			type: Object,
			default: () => ({}),
		},
		menuKey: {
			type: String,
			default: 'reviews',
		},
		emptyMessage: {
			type: String,
			default: 'Nothing here. You are all caught up!',
		},
		/** still loading (placeholders); not given: while the assignments aren't here yet */
		loading: {
			type: Boolean,
			default: null,
		},
	},

	data() {
		return { waitedLong: false };
	},

	mounted() {
		this.waitTimer = setTimeout(() => { this.waitedLong = true; }, 6000);
	},

	beforeUnmount() {
		clearTimeout(this.waitTimer);
	},

	computed: {
		isLoading() {
			// never placeholders for long: after a while, what there is (or "nothing")
			if (this.sections.length || this.waitedLong) return false;
			if (this.loading != null) return this.loading;
			const wk = useWKStore();
			return !wk.dashboardRefreshedAt && (wk.dashboardRefreshing || !wk.assignments.length);
		},
		listSections() {
			return this.sections.map(section => ({
				sectionId: section.id,
				label: section.label,
				countLabel: `(${section.items.length})`,
				subjects: section.items,
				accentColor: section.color,
				sectionColors: sectionTileColors(section.color),
				headerVariant: 'compact',
			}));
		},
		barValues() {
			return buildBarValues(this.sections);
		},
		barColors() {
			return Object.fromEntries(this.sections.map(section => [section.id, section.color]));
		},
		panelHeightStyle() {
			return {
				// sized for the 600px popup; taller windows (popped out, mobile) grow it
				'--subject-list-height': `max(${this.height}px, calc(100vh - ${600 - this.height}px))`,
			};
		},
	},

	methods: {
		scrollToSection(sectionId) {
			this.$refs.panel?.scrollToSection(sectionId);
		},
	},
};
</script>

<style scoped>
.queue-subjects {
	background-color: var(--default-color);
}
</style>
