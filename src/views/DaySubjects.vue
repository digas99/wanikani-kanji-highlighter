<template>
	<!-- a day of the activity calendar: its subjects started, passed and burned
	     (?date=YYYY-MM-DD; &jump=started|passed|burned scrolls to that part) -->
	<div class="container day-subjects">
		<QueueSubjectsView
			ref="list"
			:header-title="headerTitle"
			:sections="sections"
			:height="420"
			:bar-sorting="barSorting"
			menu-key="subjects"
			empty-message="Nothing started, passed or burned on this day."
		/>
	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import QueueSubjectsView from '@/components/Queue/QueueSubjectsView.vue';
import { buildQueueSubjectItems } from '@/utils/scripts/queueSubjects';

/** As the activity calendar's views (same colours) */
const DAY_SECTIONS = [
	{ id: 'started', field: 'started_at', label: 'Started', color: '#dd0093' },
	{ id: 'passed', field: 'passed_at', label: 'Passed', color: '#882d9e' },
	{ id: 'burned', field: 'burned_at', label: 'Burned', color: '#e20000' },
];

/** Local calendar day (as the activity calendar's keys). */
function dayKey(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default {
	name: 'DaySubjects',

	components: {
		QueueSubjectsView,
	},

	data() {
		return {
			/** scrolled to the part asked for, once it's there */
			jumped: false,
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		date() {
			return typeof this.$route.query.date === 'string' ? this.$route.query.date : dayKey(new Date());
		},
		jump() {
			const jump = this.$route.query.jump;
			return DAY_SECTIONS.some(section => section.id === jump) ? jump : null;
		},
		/** subject ids per part: what happened to them on this day */
		idsBySection() {
			const ids = Object.fromEntries(DAY_SECTIONS.map(section => [section.id, []]));
			for (const assignment of this.wk.assignments) {
				for (const section of DAY_SECTIONS) {
					const at = assignment[section.field];
					if (at && dayKey(new Date(at)) === this.date) ids[section.id].push(assignment.subject_id);
				}
			}
			return ids;
		},
		sections() {
			return DAY_SECTIONS.map(section => ({
				id: `day-${section.id}`,
				label: section.label,
				color: section.color,
				items: buildQueueSubjectItems(this.idsBySection[section.id], this.wk.assignments, this.wk.allSubjects),
			})).filter(section => section.items.length);
		},
		barSorting() {
			return Object.fromEntries(DAY_SECTIONS.map((section, index) => [`day-${section.id}`, index]));
		},
		headerTitle() {
			const count = new Set(Object.values(this.idsBySection).flat()).size;
			const [year, month, day] = this.date.split('-').map(Number);
			const label = new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
			return `<b>${count}</b> ${count === 1 ? 'subject' : 'subjects'} on <b>${label}</b>`;
		},
	},

	watch: {
		date() {
			this.jumped = false;
			void this.resolveMissing();
		},
		// opened before the assignments were loaded: their subjects once they are
		'wk.assignments'() {
			void this.resolveMissing();
		},
		// the list fills in (subjects loading): then scroll to the part asked for
		sections() {
			this.scrollToJump();
		},
	},

	created() {
		if (!this.wk.assignments.length) void this.wk.loadDashboardFromCache();
		void this.resolveMissing();
	},

	mounted() {
		this.scrollToJump();
	},

	methods: {
		/** subjects not in memory yet (the full list still loading): read from the cache */
		async resolveMissing() {
			const known = new Set(this.wk.allSubjects.map(subject => subject.id));
			const ids = [...new Set(Object.values(this.idsBySection).flat())].filter(id => !known.has(id));
			if (ids.length) await this.wk.resolveSubjects(ids);
		},
		scrollToJump() {
			if (!this.jump || this.jumped) return;
			const id = `day-${this.jump}`;
			if (!this.sections.some(section => section.id === id)) return;
			this.jumped = true;
			this.$nextTick(() => this.$refs.list?.scrollToSection(id));
		},
	},
};
</script>

<style>
/* the list is the whole page: it reaches the bottom even when short (as the reviewed page) */
.day-subjects .subject-list-panel .panel-sections {
	flex: none;
	height: var(--subject-list-height);
}
</style>

<style scoped>
.day-subjects {
	background-color: var(--default-color);
	padding: 10px 0 20px;
}
</style>
