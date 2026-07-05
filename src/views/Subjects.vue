<template>
	<div class="container subjects">
		<SubjectsList
			:values="values"
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

const LEVEL_SRS_SORTING = { '5': 0, '4': 1, '3': 2, '2': 3, '1': 4, '0': 5, '-1': 6 };

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
		};

		this.wkManager.events.on('get:subjects', this._onSubjects);
		await this.applyRoute();
	},

	beforeUnmount() {
		if (this._onSubjects) {
			this.wkManager?.events.off('get:subjects', this._onSubjects);
		}
		clearInterval(this.fetchInterval);
	},

	watch: {
		'$route.query': {
			async handler() {
				if (!this.wkManager) return;
				await this.applyRoute();
			},
			deep: true,
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

			if (this.functionName && this.values.length === 0) {
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
