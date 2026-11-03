<template>
	<div class="container subjects">
		<SubjectsList
			:values="values"
			:loading="loading"
			:colors="colors"
			:sorting="sorting"
			:id="id"
			:type="type"
			:jump-section="jumpSection"
			:height="455"
		/>
	</div>
</template>

<script>
import { useWKStore } from '@/stores';

import SubjectsList from '@/components/Subjects/SubjectsList.vue';

import { typeColors, srsStages, formatSubjectsData } from '@/utils/scripts/wanikani';
import { wrapSubjectsToStage5 } from '@/utils/scripts/common';

// lowest stage first, passed (Guru and above) after Apprentice IV, locked last
const LEVEL_SRS_SORTING = { '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '-1': 6 };

export default {
	name: 'Subjects',
	components: {
		SubjectsList,
	},

	data() {
		return {
			type: this.$route.query.type,
			id: parseInt(this.$route.query.id, 10),
			jumpSection: this.$route.query.srs != null ? String(this.$route.query.srs) : null,
			functionName: null,
			wkManager: null,
			fetchInterval: null,
			fetchId: null,

			values: [],
			/** asked the library, no answer yet (from the start: before the first request too) */
			fetching: ['srs', 'level'].includes(this.$route.query.type),
			colors: [],
			sorting: {
				radical: 0,
				kanji: 1,
				vocabulary: 2,
			},
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		typeColors() {
			return typeColors;
		},
		/**
		 * Placeholders while the list is still coming: the locked list until every level is in
		 * memory (a few seconds after opening the popup), others until the library answers.
		 */
		loading() {
			if (this.type === 'locked') return !this.wk.allSubjectsInMemory;
			return this.fetching && !this.values.length;
		},
	},

	async created() {
		this.wkManager = this.wk.manager;
		if (!this.wkManager) return;

		this._onSubjects = ({ state, data, context }) => {
			if (this.type === 'level') {
				const level = context?.levels?.[0];
				if (level == null || level !== this.fetchId || !data?.length) return;
			} else {
				const caller = context?.caller;
				if (caller === undefined || (state === 'updated' && this.fetchId !== caller)) return;
			}

			let nextValues = formatSubjectsData(data);
			if (this.type === 'level') {
				const subjectType = this.$route.query.subjectType;
				if (subjectType) {
					nextValues = nextValues.filter(item =>
						(item.type || item.subject_type) === subjectType,
					);
				}
				nextValues = wrapSubjectsToStage5(nextValues);
			}
			this.values = nextValues;
			if (state === 'updated' || nextValues.length) this.fetching = false;
		};

		this.wkManager.events.on('get:subjects', this._onSubjects);
		await this.applyRoute();
	},

	beforeUnmount() {
		if (this._onSubjects) {
			this.wkManager?.events.off('get:subjects', this._onSubjects);
		}
		clearInterval(this.fetchInterval);
		clearTimeout(this.fetchingTimer);
	},

	watch: {
		'$route.query': {
			async handler() {
				if (!this.wkManager) return;
				await this.applyRoute();
			},
			deep: true,
		},
		// the Legacy list comes from the subjects in memory, which may still be loading
		'wk.allSubjects'() {
			if (this.type === 'legacy' || this.type === 'locked') this.values = this.fetchLocalCache();
		},
	},

	methods: {
		async applyRoute() {
			this.type = this.$route.query.type;
			this.id = parseInt(this.$route.query.id, 10);
			this.jumpSection = this.$route.query.srs != null ? String(this.$route.query.srs) : null;
			this.fetchId = this.type === 'level'
				? parseInt(this.$route.query.level, 10)
				: this.id;

			this.values = this.fetchLocalCache();
			this.functionName = this.getFunctionName();
			this.colors = await this.getColors();
			this.sorting = this.getSorting();

			this.fetching = false;
			if (this.functionName && this.values.length === 0) {
				this.fetching = true;
				// its answer comes as an event (_onSubjects); never waiting forever on it
				clearTimeout(this.fetchingTimer);
				this.fetchingTimer = setTimeout(() => { this.fetching = false; }, 15_000);
				this.wkManager[this.functionName](this.fetchId);
			}
		},
		fetchLocalCache() {
			if (this.type === 'level') {
				const level = parseInt(this.$route.query.level, 10);
				const subjectType = this.$route.query.subjectType;
				if (!Number.isFinite(level)) return [];

				let subjects = this.wk.allSubjects.filter(item => item.level === level);
				if (subjectType) {
					subjects = subjects.filter(item =>
						(item.type || item.subject_type) === subjectType,
					);
				}
				return wrapSubjectsToStage5(subjects);
			}

			// subjects WaniKani removed from lessons and reviews (shown as "Legacy")
			if (this.type === 'legacy') {
				return this.wk.allSubjects.filter(item => item.hidden_at);
			}

			// not unlocked yet (no lesson so far), nor retired: Home's overview bar, its grey part
			if (this.type === 'locked') {
				// an assignment: unlocked (as Home's count, countLockedSubjects)
				const unlocked = new Set(this.wk.assignments.map(a => a.subject_id));
				return this.wk.allSubjects.filter(item => !item.hidden_at && !unlocked.has(item.id));
			}

			if (this.type !== 'srs') return [];

			const byId = new Map(this.wk.allSubjects.map(item => [item.id, item]));
			const fromAssignments = this.wk.assignments
				.filter(a => !a.hidden && a.srs_stage == this.id)
				.map(a => {
					const subject = byId.get(a.subject_id);
					if (subject) return subject;
					return {
						id: a.subject_id,
						type: a.subject_type,
						subject_type: a.subject_type,
						assignment: {
							srs_stage: a.srs_stage,
							passed_at: a.passed_at,
							hidden: a.hidden,
						},
					};
				});

			if (fromAssignments.length) return fromAssignments;

			return this.wk.allSubjects.filter(
				item => item.assignment && item.assignment.srs_stage == this.id,
			);
		},
		getFunctionName() {
			switch (this.type) {
				case 'srs':
					return 'getSubjectsBySRSStage';
				case 'level':
					return 'getSubjectsByLevel';
			}
			return null;
		},
		getSorting() {
			if (this.type === 'level') {
				return { ...LEVEL_SRS_SORTING };
			}
			return {
				radical: 0,
				kanji: 1,
				vocabulary: 2,
			};
		},
		async getColors() {
			switch (this.type) {
				case 'srs':
				case 'legacy':
				case 'locked':
					return this.typeColors;
				case 'level': {
					const colors = Object.fromEntries(
						Object.entries(srsStages).map(([key, value]) => [key, value.color]),
					);
					colors['5'] = '#000000';
					colors['-1'] = '#ffffff';
					return colors;
				}
			}
			return [];
		},
	},
};
</script>

<style scoped>
.container {
	background-color: var(--default-color);
}
</style>

<style>
.subjects .subjects-list-content {
	min-height: 500px;
}
</style>
