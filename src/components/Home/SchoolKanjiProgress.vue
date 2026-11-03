<template>
	<div class="school-kanji-progress">
		<div
			v-for="row in rows"
			:key="row.grade"
			class="school-progress-row"
			:class="{ marked: row.grade === markedGrade }"
		>
			<SchoolProgressBar
				:school="school"
				:grade="row.grade"
				:total="row.total"
				:segments="row.segments"
				:kind="kind"
			/>
			<RouterLink
				class="school-grade-label clickable"
				:title="`Total: ${row.total}`"
				:to="{
					name: 'SchoolSubjects',
					query: { school, grade: row.grade, ...(kind === 'vocabulary' ? { kind } : {}) },
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
	readSchoolProgressSnapshot,
	writeSchoolProgressSnapshot,
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
		/** 'kanji' | 'vocabulary' (WaniKani's words in the JLPT lists / by their hardest kanji) */
		kind: {
			type: String,
			default: 'kanji',
		},
		/**
		 * Every subject level is in memory. Until then the saved bars stay (subjects load a level
		 * at a time: live bars would grow while you look).
		 */
		complete: {
			type: Boolean,
			default: true,
		},
		/** a level to point out (e.g. the one of the subject a details chip came from) */
		markedGrade: {
			type: String,
			default: '',
		},
	},

	computed: {
		/** Computed from the in-memory subjects (null until they've loaded). */
		liveRows() {
			if (!this.subjects.length) return null;
			const school = this.school;
			return SCHOOL_CONFIG[school].grades.map(grade =>
				buildSchoolGradeStats(this.subjects, school, grade, this.kind),
			);
		},
		snapshotRows() {
			return readSchoolProgressSnapshot(this.school, this.kind);
		},
		/** The saved bars right away; the live ones once every level is in (or with nothing saved). */
		rows() {
			if (this.liveRows && (this.complete || !this.snapshotRows)) return this.liveRows;
			return this.snapshotRows ?? this.liveRows ?? [];
		},
	},

	watch: {
		liveRows: {
			handler(rows) {
				// only complete numbers are worth keeping for next time
				if (rows && this.complete) writeSchoolProgressSnapshot(this.school, rows, this.kind);
			},
			immediate: true,
		},
		complete(done) {
			if (done && this.liveRows) writeSchoolProgressSnapshot(this.school, this.liveRows, this.kind);
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

/* the level pointed out: a soft outline around its row */
.school-progress-row.marked {
	margin: 0 -4px;
	padding: 2px 4px;
	border-radius: 12px;
	box-shadow: 0 0 0 2px var(--pill-color, #e36f94);
}

.school-progress-row.marked .school-grade-label {
	background: var(--pill-color, #e36f94);
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
