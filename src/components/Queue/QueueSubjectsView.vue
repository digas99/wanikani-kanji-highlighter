<template>
	<SubjectListPanel
		ref="panel"
		class="queue-subjects"
		:header-title="headerTitle"
		:sections="listSections"
		:show-bar="showBar && barValues.length > 0"
		:menu-key="menuKey"
		:empty-message="emptyMessage"
		:style="panelHeightStyle"
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
</template>

<script>
import ProgressionBar from '@/components/Home/ProgressionBar.vue';
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
	},

	computed: {
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
				'--subject-list-height': `${this.height}px`,
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
