<template>
	<div class="container reviews-page">
		<QueueSubjectsView
			:header-title="headerTitle"
			:sections="displaySections"
			:height="250"
			:bar-sorting="barSorting"
			empty-message="No reviews found. You're all caught up!"
		/>
		<ReviewsChart
			:assignments="wk.assignments"
			@select="onChartSelect"
			@reset="onChartReset"
		/>
	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import QueueSubjectsView from '@/components/Queue/QueueSubjectsView.vue';
import ReviewsChart from '@/components/Reviews/ReviewsChart.vue';
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
		onChartSelect({ assignments, title }) {
			this.chartSelection = { assignments, title };
		},
		onChartReset() {
			this.chartSelection = null;
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
