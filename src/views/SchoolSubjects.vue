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
		/** ?kind=vocabulary: WaniKani's words in that level / grade; else its kanji */
		kind() {
			return this.$route.query.kind === 'vocabulary' ? 'vocabulary' : 'kanji';
		},
		config() {
			return SCHOOL_CONFIG[this.school] ?? null;
		},
		stats() {
			if (!this.config || !this.grade) return null;
			return buildSchoolGradeStats(this.wk.allSubjects, this.school, this.grade, this.kind);
		},
		headerTitle() {
			if (!this.stats) return '';
			const what = this.kind === 'vocabulary' ? 'Words' : 'Kanji';
			return `<b>${this.stats.total}</b> ${what} from <b>${this.config.title.replace(' Kanji Progress', '').replace(' Progress', '')} ${this.config.gradeLabel(this.grade)}</b>`;
		},
		sections() {
			if (!this.config || !this.grade) return [];
			return buildSchoolSections(this.wk.allSubjects, this.school, this.grade, this.kind);
		},
		barValues() {
			if (!this.stats) return [];
			return this.stats.segments.map(segment => ({
				id: segment.column,
				items: Array.from({ length: segment.count }),
			}));
		},
		barColors() {
			if (!this.stats) return {};
			return Object.fromEntries(this.stats.segments.map(segment => [segment.column, segment.background]));
		},
		panelHeightStyle() {
			// 455px in the 600px popup; taller windows (popped out, mobile) use their height
			return { '--subject-list-height': 'max(455px, calc(100vh - 145px))' };
		},
		emptyMessage() {
			return this.kind === 'vocabulary' ? 'No WaniKani words for this grade.' : 'No kanji found for this grade.';
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
