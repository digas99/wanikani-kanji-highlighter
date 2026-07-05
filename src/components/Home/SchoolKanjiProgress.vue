<template>
	<div class="school-kanji-progress">
		<div
			v-for="row in rows"
			:key="row.grade"
			class="school-progress-row"
		>
			<SchoolProgressBar
				:school="school"
				:grade="row.grade"
				:total="row.total"
				:segments="row.segments"
			/>
			<RouterLink
				class="school-grade-label clickable"
				:title="`Total: ${row.total}`"
				:to="{
					name: 'SchoolSubjects',
					query: { school, grade: row.grade },
				}"
			>
				{{ row.label }}
			</RouterLink>
		</div>
	</div>
</template>

<script>
import { RouterLink } from 'vue-router';
import SchoolProgressBar from '@/components/Home/SchoolProgressBar.vue';
import {
	SCHOOL_CONFIG,
	buildSchoolGradeStats,
} from '@/utils/scripts/schoolKanji';

export default {
	name: 'SchoolKanjiProgress',

	components: {
		RouterLink,
		SchoolProgressBar,
	},

	props: {
		school: {
			type: String,
			required: true,
			validator: value => ['jlpt', 'joyo'].includes(value),
		},
		subjects: {
			type: Array,
			default: () => [],
		},
	},

	computed: {
		rows() {
			const school = this.school;
			return SCHOOL_CONFIG[school].grades.map(grade =>
				buildSchoolGradeStats(this.subjects, school, grade),
			);
		},
	},
};
</script>

<style scoped>
.school-kanji-progress {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.school-progress-row {
	display: flex;
	align-items: center;
	gap: 5px;
	width: 100%;
}

.school-grade-label {
	flex-shrink: 0;
	width: 40px;
	padding: 5px;
	border-radius: 5px;
	background: var(--default-color);
	color: white;
	font-size: 12px;
	text-align: center;
	text-decoration: none;
}
</style>
