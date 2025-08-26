<template>
	<div class="container" style="background-color: var(--default-color);">
		<ReviewsInfo :next="futureAssignments?.nextReviews" />
		<div class="stats" style="padding-bottom: 150px;">
			<SRSProgressionTiles :assignmentsBySRSStage="assignmentsBySRSStage" />
			<SRSProgressionBar :assignmentsBySRSStage="assignmentsBySRSStage" />
		</div>
	</div>

	<KanjiInPageList class="kanji-list" />
</template>

<script>
import { getWKManager } from '@/lib/apiClient';

import ReviewsInfo from '@/components/Home/ReviewsInfo.vue';
import SRSProgressionTiles from '@/components/Home/SRSProgressionTiles.vue';
import SRSProgressionBar from '@/components/Home/SRSProgressionBar.vue';
import KanjiInPageList from '@/components/Home/KanjiInPageList.vue';

export default {
	name: 'Home',

	components: {
		ReviewsInfo,
		SRSProgressionTiles,
		SRSProgressionBar,
		KanjiInPageList
	},

	data() {
		return {
			dataInterval: null,
			futureAssignments: {},
			assignmentsBySRSStage: {}
		};
	},

	mounted() {
		const wkManager = getWKManager();
		wkManager.getFutureAssignments();
		this.dataInterval = setInterval(() => {
			wkManager.getFutureAssignments();
			wkManager.getAssignments();
		}, 1000);

		wkManager.events.on('get:assignments:future', data => {
			this.futureAssignments = data;
		});

		wkManager.events.on('get:assignments', data => {
			this.assignmentsBySRSStage = data.entries.reduce((acc, assignment) => {
				if (!acc[assignment.srs_stage]) {
					acc[assignment.srs_stage] = [];
				}
				acc[assignment.srs_stage].push(assignment);
				return acc;
			}, {});
		});
	},

	beforeUnmount() {
		clearInterval(this.futureAssignmentsInterval);
	}
}
</script>

<style scoped>
.container {
	display: flex;
	flex-direction: column;
}

.kanji-list {
	position: fixed;
	bottom: 0;
	left: 0;
	/* leave space for sidebar */
	right: 45px;
	margin: auto;
	width: fit-content;
}

.stats {
	background-color: white;
	border-top-right-radius: 5px;
	border-top-left-radius: 5px;
	height: 100%;
}
</style>