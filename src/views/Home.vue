<template>
	<div class="container home">
		<ReviewsInfo :next="futureAssignments?.nextReviews" />
		<div class="stats" style="padding-bottom: 160px;">
			<ProgressionTiles :values="progressionTilesValues" :colors="progressionTilesColors"
				:type="progressionTilesType" @mouseover="updateProgressionBar"
				@mouseleave="resumeRefreshProgressions" />
			<ProgressionBar :values="progressionBarValues" :colors="progressionBarColors" :type="progressionBarType"
				:sorting="progressionBarSorting" :title="progressionBarTitle"
				:description="progressionBarDescription" />
		</div>
	</div>

	<KanjiInPageList class="kanji-list" />
</template>

<script>
import { getWKManager } from '@/lib/apiClient';
import { useWKStore } from '@/stores';

import ReviewsInfo from '@/components/Home/ReviewsInfo.vue';
import ProgressionTiles from '@/components/Home/ProgressionTiles.vue';
import ProgressionBar from '@/components/Home/ProgressionBar.vue';
import KanjiInPageList from '@/components/Home/KanjiInPageList.vue';

import { srsStages, typeColors } from '@/utils/scripts/wanikani';
import { groupByType, groupBySRSStage } from '@/utils/scripts/common';

export default {
	name: 'Home',

	components: {
		ReviewsInfo,
		ProgressionTiles,
		ProgressionBar,
		KanjiInPageList
	},

	data() {
		return {
			wkManager: null,
			dataInterval: null,
			futureAssignments: {},
			srsStageColors: {},
			progressionTilesValues: [
				{ id: 0, items: [] },
				{ id: 1, items: [] },
				{ id: 2, items: [] },
				{ id: 3, items: [] },
				{ id: 4, items: [] },
				{ id: 5, items: [] },
				{ id: 6, items: [] },
				{ id: 7, items: [] },
				{ id: 8, items: [] },
				{ id: 9, items: [] }
			],
			progressionTilesColors: {},
			progressionTilesType: null,
			progressionBarValues: [
				{ id: 0, items: [] },
				{ id: 1, items: [] },
				{ id: 2, items: [] },
				{ id: 3, items: [] },
				{ id: 4, items: [] },
				{ id: 5, items: [] },
				{ id: 6, items: [] },
				{ id: 7, items: [] },
				{ id: 8, items: [] },
				{ id: 9, items: [] }
			],
			progressionBarColors: {},
			progressionBarType: null,
			progressionBarSorting: {},
			progressionBarTitle: null,
			progressionBarDescription: null,
			refreshProgressions: true
		};
	},

	computed: {
		srsStages() {
			return srsStages;
		},
		typeColors() {
			return typeColors;
		},
		wk() {
			return useWKStore();
		},
	},

	mounted() {
		this.wkManager = getWKManager();

		this.getData();
		this.dataInterval = setInterval(this.getData, 1000);

		this.srsStageColors = Object.fromEntries(Object.entries(this.srsStages).map(([k, v]) => [k, v.color]));
		this.progressionTilesColors = this.srsStageColors;
		this.progressionBarColors = this.srsStageColors;

		this.wkManager.events.on('get:assignments:future', ({ state, data }) => {
			this.futureAssignments = data;
		});

		this.wkManager.events.on('get:assignments', ({ state, data }) => {
			if (!data) return;

			const assignmentsBySrsStage = groupBySRSStage(data);

			if (assignmentsBySrsStage.length) {
				if (this.refreshProgressions) {
					this.progressionTilesValues = assignmentsBySrsStage;
					this.progressionTilesColors = this.srsStageColors;
					this.progressionTilesType = "srs";

					this.progressionBarValues = assignmentsBySrsStage;
					this.progressionBarColors = this.srsStageColors;
					this.progressionBarType = "srs";
					this.progressionBarSorting = {};
				}
			}
		});

		this.wkManager.events.on('update:assignments', data => {
			console.log(data);
		});
	},

	beforeUnmount() {
		clearInterval(this.dataInterval);

		this.wkManager.events.removeListener('get:assignments:future');
		this.wkManager.events.removeListener('get:assignments');
	},

	methods: {
		getData() {
			console.log("Getting data...");

			this.wkManager.getFutureAssignments();
			this.wkManager.getAssignments();
			if (this.wk.userInfo?.level)
				this.wkManager.updateAssignmentsByLevel(this.wk.userInfo?.level);
		},
		updateProgressionBar(items) {
			if (items.length > 0) {
				this.refreshProgressions = false;
				this.progressionBarTitle = this.srsStages[items[0].srs_stage]?.name || null;

				const assignments = groupByType(items);

				if (assignments.length > 0) {
					this.progressionBarValues = assignments;
					this.progressionBarType = "type";
					this.progressionBarSorting = { "radical": 0, "kanji": 1, "vocabulary": 2 };
					this.progressionBarColors = this.typeColors;
					this.progressionBarDescription = `<div style='display: flex; gap: 15px; justify-content: center;'>
						<span><span style='font-weight: bold;'>Radicals:</span> ${assignments.find(item => item.id === "radical")?.items.length || 0}</span>
						<span><span style='font-weight: bold;'>Kanji:</span> ${assignments.find(item => item.id === "kanji")?.items.length || 0}</span>
						<span><span style='font-weight: bold;'>Vocabulary:</span> ${assignments.find(item => item.id === "vocabulary")?.items.length || 0}</span>
					</div>`;
				}
			}
		},
		resumeRefreshProgressions() {
			this.refreshProgressions = true;
			this.progressionBarDescription = null;
			this.progressionBarTitle = null;
			this.getData();
		}
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

#progression-bar {
	padding: 7px;
}
</style>

<style>
.home #progression-bar>li:first-child,
.home #progression-bar>li:first-child>a {
	border-radius: 5px 0 0 5px;
}

.home #progression-bar>li:last-child,
.home #progression-bar>li:last-child>a {
	border-radius: 0 5px 5px 0;
}
</style>