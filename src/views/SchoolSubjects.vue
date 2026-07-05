<template>
	<div class="container school-subjects">
		<SubjectListPanel
			ref="panel"
			:header-title="headerTitle"
			:sections="sections"
			menu-key="subjects"
			:show-bar="barValues.length > 0"
			:empty-message="emptyMessage"
			:style="panelHeightStyle"
			@scroll="saveScroll"
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
import { useWKStore } from '@/stores';
import ProgressionBar from '@/components/Home/ProgressionBar.vue';
import SubjectListPanel from '@/components/Subjects/SubjectListPanel.vue';
import {
	SCHOOL_CONFIG,
	buildSchoolGradeStats,
	buildSchoolSections,
} from '@/utils/scripts/schoolKanji';

export default {
	name: 'SchoolSubjects',

	components: {
		ProgressionBar,
		SubjectListPanel,
	},

	data() {
		return {
			barSorting: {
				burned: 0,
				passed: 1,
				progress: 2,
				locked: 3,
			},
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		school() {
			return String(this.$route.query.school || '');
		},
		grade() {
			return String(this.$route.query.grade || '');
		},
		jump() {
			return this.$route.query.jump ? String(this.$route.query.jump) : null;
		},
		config() {
			return SCHOOL_CONFIG[this.school] ?? null;
		},
		headerTitle() {
			if (!this.config || !this.grade) return '';
			const stats = buildSchoolGradeStats(this.wk.allSubjects, this.school, this.grade);
			return `<b>${stats.total}</b> Kanji from <b>${this.config.title.replace(' Progress', '')} ${this.config.gradeLabel(this.grade)}</b>`;
		},
		sections() {
			if (!this.config || !this.grade) return [];
			return buildSchoolSections(this.wk.allSubjects, this.school, this.grade);
		},
		barValues() {
			if (!this.config || !this.grade) return [];
			const stats = buildSchoolGradeStats(this.wk.allSubjects, this.school, this.grade);
			return stats.segments.map(segment => ({
				id: segment.column,
				items: Array.from({ length: segment.count }),
			}));
		},
		barColors() {
			if (!this.config || !this.grade) return {};
			const stats = buildSchoolGradeStats(this.wk.allSubjects, this.school, this.grade);
			return Object.fromEntries(stats.segments.map(segment => [segment.column, segment.background]));
		},
		panelHeightStyle() {
			return { '--subject-list-height': '455px' };
		},
		emptyMessage() {
			return 'No kanji found for this grade.';
		},
	},

	mounted() {
		this.$nextTick(() => this.scrollToJump());
	},

	watch: {
		'$route.query': {
			handler() {
				this.$nextTick(() => this.scrollToJump());
			},
			deep: true,
		},
	},

	methods: {
		saveScroll(scrollTop) {
			this.wk.subjectsListScroll = scrollTop;
		},
		scrollToSection(sectionId) {
			this.$refs.panel?.scrollToSection(`${this.school}-${this.grade}-${sectionId}`);
		},
		scrollToJump() {
			if (!this.jump) return;
			this.$refs.panel?.scrollToSection(`${this.school}-${this.grade}-${this.jump}`);
		},
	},
};
</script>

<style scoped>
.container {
	background-color: var(--default-color);
}
</style>
