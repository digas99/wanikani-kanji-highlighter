<template>
	<div class="container" style="background-color: var(--default-color);">
		<ReviewsInfo :next="futureAssignments?.nextReviews" />
		<div class="stats" style="padding-bottom: 150px;">
			<SRSProgressionTiles :values="progressionTilesValues" :colors="progressionTilesColors"
				@mouseover="updateProgressionBar" @mouseleave="resumeRefreshProgressions" />
			<SRSProgressionBar :values="progressionBarValues" :colors="progressionBarColors"
				:sorting="progressionBarSorting" :title="progressionBarTitle"
				:description="progressionBarDescription" />
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

import { srsStages } from '@/utils/wanikani';

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
			progressionBarSorting: {},
			progressionBarTitle: null,
			progressionBarDescription: null,
			refreshProgressions: true
		};
	},

	computed: {
		srsStages() {
			return srsStages;
		}
	},

	mounted() {
		this.wkManager = getWKManager();

		this.getData();
		this.dataInterval = setInterval(this.getData, 1000);

		this.srsStageColors = Object.fromEntries(Object.entries(this.srsStages).map(([k, v]) => [k, v.color]));
		this.progressionTilesColors = this.srsStageColors;
		this.progressionBarColors = this.srsStageColors;

		this.wkManager.events.on('get:assignments:future', data => {
			this.futureAssignments = data;
		});

		this.wkManager.events.on('get:assignments', data => {
			const assignmentsBySrsStage = data.entries.reduce((acc, assignment) => {
				if (!acc.find(item => item.id === assignment.srs_stage)) {
					acc.push({ id: assignment.srs_stage, items: [] });
				}
				acc.find(item => item.id === assignment.srs_stage).items.push(assignment);
				return acc;
			}, []);

			if (assignmentsBySrsStage.length) {
				if (this.refreshProgressions) {
					this.progressionTilesValues = assignmentsBySrsStage;
					this.progressionTilesColors = this.srsStageColors;

					this.progressionBarValues = assignmentsBySrsStage;
					this.progressionBarColors = this.srsStageColors;
					this.progressionBarSorting = {};
				}
			}
		});
	},

	beforeUnmount() {
		clearInterval(this.futureAssignmentsInterval);
	},

	methods: {
		getData() {
			this.wkManager.getFutureAssignments();
			this.wkManager.getAssignments();
		},
		updateProgressionBar(items) {
			this.refreshProgressions = false;
			if (items.length > 0) {
				this.progressionBarTitle = this.srsStages[items[0].srs_stage]?.name || null;

				const assignments = items.reduce((acc, item) => {
					const type = item.subject_type === "kana_vocabulary" ? "vocabulary" : item.subject_type;
					if (!acc.find(i => i.id === type)) {
						acc.push({ id: type, items: [] });
					}
					acc.find(i => i.id === type).items.push(item);
					return acc;
				}, []);

				if (assignments.length > 0) {
					this.progressionBarValues = assignments;
					this.progressionBarSorting = { "radical": 0, "kanji": 1, "vocabulary": 2 };
					this.progressionBarColors = {
						"radical": "#00a1f1",
						"kanji": "#f100a1",
						"vocabulary": "#a100f1",
					};
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
</style>