<template>
	<!-- every row of a progress card at once, a section per row (its label on the right):
	     ?list=levels (Levels in progress) or ?list=school&school=jlpt|joyo[&kind=vocabulary] -->
	<div class="container subject-groups">
		<SubjectListPanel
			ref="panel"
			:header-title="headerTitle"
			:sections="sections"
			menu-key="subjects"
			:show-bar="sections.length > 1"
			:empty-message="loading ? 'Loading subjects…' : 'Nothing here right now.'"
			:style="panelHeightStyle"
		>
			<template #bar>
				<ProgressionBar
					:values="barValues"
					:colors="barColors"
					:sorting="barSorting"
					scroll-to-sections
					@section-select="id => $refs.panel?.scrollToSection(id)"
				/>
			</template>
		</SubjectListPanel>
	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import ProgressionBar from '@/components/Home/ProgressionBar.vue';
import SubjectListPanel from '@/components/Subjects/SubjectListPanel.vue';
import { typeColors } from '@/utils/scripts/wanikani';
import { SCHOOL_CONFIG, getSchoolKanjiSubjects, subjectMatchesSchoolGrade } from '@/utils/scripts/schoolKanji';
import { JLPT_GRADE_SECTIONS, JOYO_GRADE_SECTIONS } from '@/utils/highlight/schoolGradeHighlight';

const TYPE_NAMES = {
	radical: 'Radicals',
	kanji: 'Kanji',
	vocabulary: 'Vocabulary',
};

/** As LevelsInProgress: a type is in progress while something of it is unlocked and not passed. */
const inProgress = typeGroup => typeGroup.items.some(
	item => item.assignment?.srs_stage != null && item.assignment?.passed_at == null,
);

export default {
	name: 'SubjectGroups',

	components: {
		ProgressionBar,
		SubjectListPanel,
	},

	computed: {
		wk() {
			return useWKStore();
		},
		list() {
			return this.$route.query.list === 'school' ? 'school' : 'levels';
		},
		school() {
			return this.$route.query.school === 'joyo' ? 'joyo' : 'jlpt';
		},
		kind() {
			return this.$route.query.kind === 'vocabulary' ? 'vocabulary' : 'kanji';
		},
		/** the lists need every subject: startup is still loading them into memory */
		loading() {
			return this.list === 'school' && !this.wk.allSubjectsInMemory;
		},
		sections() {
			if (this.loading) return [];
			return this.list === 'school' ? this.schoolSections : this.levelSections;
		},
		/** Levels in progress: a section per level and type ("Level 7 · Vocabulary") */
		levelSections() {
			// the card's items are trimmed (no characters): the full subjects, by id
			const subjectById = new Map(this.wk.allSubjects.map(subject => [subject.id, subject]));
			const full = item => {
				const subject = subjectById.get(item.id ?? item.subject_id);
				return subject ? { ...subject, assignment: item.assignment ?? subject.assignment } : item;
			};
			return [...this.wk.levelsInProgress]
				.sort((a, b) => Number(a.level) - Number(b.level))
				.flatMap(level => level.items.filter(inProgress).map(typeGroup => ({
					sectionId: `groups-${level.level}-${typeGroup.id}`,
					label: `Level ${level.level} · ${TYPE_NAMES[typeGroup.id] ?? typeGroup.id}`,
					countLabel: `(${typeGroup.items.length})`,
					subjects: typeGroup.items.map(full),
					accentColor: typeColors[typeGroup.id] ?? '#888888',
				})))
				.map((section, index) => ({ ...section, headerVariant: 'compact', showControls: index === 0 }));
		},
		/** JLPT / Jōyō: a section per level / grade, its kanji (or WaniKani's words) */
		schoolSections() {
			const subjects = getSchoolKanjiSubjects(this.wk.allSubjects, this.school, this.kind);
			const colors = this.school === 'jlpt' ? JLPT_GRADE_SECTIONS : JOYO_GRADE_SECTIONS;
			return SCHOOL_CONFIG[this.school].grades
				.map(grade => {
					const gradeSubjects = subjects.filter(subject => subjectMatchesSchoolGrade(subject, this.school, grade));
					return {
						sectionId: `groups-${this.school}-${grade}`,
						label: SCHOOL_CONFIG[this.school].gradeLabel(grade),
						countLabel: `(${gradeSubjects.length})`,
						subjects: gradeSubjects,
						accentColor: colors.find(section => section.key === grade)?.fallbackColor ?? '#888888',
						headerVariant: 'compact',
					};
				})
				.filter(section => section.subjects.length)
				.map((section, index) => ({ ...section, showControls: index === 0 }));
		},
		headerTitle() {
			if (this.loading) return '';
			const total = this.sections.reduce((sum, section) => sum + section.subjects.length, 0);
			if (this.list === 'levels') return `<b>${total}</b> Subjects in levels in progress`;
			const what = this.kind === 'vocabulary' ? 'Words' : 'Kanji';
			return `<b>${total}</b> ${what} from <b>${this.school === 'jlpt' ? 'JLPT' : 'Jōyō'}</b>`;
		},
		barValues() {
			return this.sections.map(section => ({ id: section.sectionId, items: section.subjects }));
		},
		barColors() {
			return Object.fromEntries(this.sections.map(section => [section.sectionId, section.accentColor]));
		},
		barSorting() {
			return Object.fromEntries(this.sections.map((section, index) => [section.sectionId, index]));
		},
		panelHeightStyle() {
			// as SchoolSubjects: 455px in the 600px popup, the window's height when taller
			return { '--subject-list-height': 'max(455px, calc(100vh - 145px))' };
		},
	},

	mounted() {
		// opened straight away (before every subject is in memory): the levels shown, from the cache
		if (this.list === 'levels' && !this.wk.allSubjectsInMemory) {
			for (const level of this.wk.levelsInProgress) void this.wk.fetchSubjectsForLevel(Number(level.level));
		}
	},
};
</script>

<style scoped>
.container {
	background-color: var(--default-color);
}
</style>
