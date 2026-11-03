<template>
	<div class="container reviews-page">
		<QueueSubjectsView
			ref="list"
			:header-title="headerTitle"
			:sections="displaySections"
			:height="250"
			:bar-sorting="barSorting"
			empty-message="No reviews found. You're all caught up!"
			:loading="!wk.dashboardRefreshedAt"
		/>
		<ReviewsChart
			:assignments="wk.assignments"
			:initial-date="typeof $route.query.date === 'string' ? $route.query.date : ''"
			@select="onChartSelect"
			@reset="onChartReset"
		/>
		<WorkloadForecast :assignments="wk.assignments" />
	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import QueueSubjectsView from '@/components/Queue/QueueSubjectsView.vue';
import ReviewsChart from '@/components/Reviews/ReviewsChart.vue';
import WorkloadForecast from '@/components/Reviews/WorkloadForecast.vue';
import { SRS_STAGE_IDS } from '@/utils/scripts/common';
import {
	buildQueueSubjectItems,
	groupReviewQueueSections,
} from '@/utils/scripts/queueSubjects';

export default {
	name: 'Reviews',

	components: {
		QueueSubjectsView,
		ReviewsChart,
		WorkloadForecast,
	},

	data() {
		return {
			chartSelection: null,
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		displayItems() {
			if (this.chartSelection) {
				return buildQueueSubjectItems(
					this.chartSelection.assignments.map(item => item.subject_id),
					this.wk.assignments,
					this.wk.allSubjects,
				);
			}

			return buildQueueSubjectItems(
				this.wk.summary.reviews.map(item => item.subject_id),
				this.wk.assignments,
				this.wk.allSubjects,
			);
		},
		displaySections() {
			return groupReviewQueueSections(this.displayItems);
		},
		headerTitle() {
			if (this.chartSelection) {
				return `<b>${this.displayItems.length}</b> Subjects on <b>${this.chartSelection.title}</b>`;
			}
			return `<b>${this.wk.summary.reviews.length}</b> Reviews available right now!`;
		},
		barSorting() {
			return Object.fromEntries(
				SRS_STAGE_IDS
					.filter(stage => stage > 0 && stage < 9)
					.map(stage => [String(stage), stage]),
			);
		},
	},

	mounted() {
		this.wk.refreshDashboard();
	},

	methods: {
		onChartSelect({ assignments, title, reveal = false }) {
			this.chartSelection = { assignments, title };
			// clicked a bar: scroll just enough for the list above the chart to show
			if (reveal) {
				this.$nextTick(() => {
					const list = this.$refs.list?.$el;
					if (!list) return;
					// just below the fixed top bar (scrollIntoView would hide it under the bar)
					const topbar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) || 45;
					const top = list.getBoundingClientRect().top + window.scrollY - topbar - 8;
					if (top < window.scrollY) window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
				});
			}
		},
		onChartReset() {
			this.chartSelection = null;
			// opened on a day (Home's calendar): a reload shouldn't go back to it
			if (this.$route.query.date) {
				const { date, ...query } = this.$route.query;
				this.$router.replace({ query });
			}
		},
	},
};
</script>

<style scoped>
.reviews-page {
	background-color: var(--default-color);
	padding-bottom: 20px;
}
</style>

<style>
.reviews-page .queue-subjects-content {
	min-height: 250px;
}
</style>
