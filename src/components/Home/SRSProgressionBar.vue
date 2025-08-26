<template>
	<ul id="progression-bar">
		<li v-for="(assignments, stage) in assignmentsBySRSStage" :key="stage"
			:style="{ width: `${(assignments.length / totalAssignments) * 100}%` }">
			<RouterLink :to="{ name: 'Reviews' }" :style="{ backgroundColor: srsStages[stage].color }">
				<span v-if="showPercentage(stage)">{{ getStagePercentage(stage) }}%</span>
			</RouterLink>
		</li>
	</ul>
</template>

<script>
import { RouterLink } from 'vue-router';

import { srsStages } from '@/utils/wanikani';

export default {
	name: 'SRSProgressionBar',

	computed: {
		srsStages() {
			return srsStages;
		},
		totalAssignments() {
			return Object.values(this.assignmentsBySRSStage).flat().length;
		}
	},

	props: {
		assignmentsBySRSStage: {
			type: Object,
			default: () => ({})
		}
	},

	methods: {
		getStagePercentage(stage) {
			const assignments = this.assignmentsBySRSStage[stage] || [];
			return ((assignments.length / this.totalAssignments) * 100).toFixed(1);
		},
		showPercentage(stage) {
			const percentage = this.getStagePercentage(stage);
			return percentage >= 10;
		}
	}
}
</script>

<style scoped>
#progression-bar {
	border-radius: 20px;
	padding: 7px;
	height: 25px;
	display: flex;
	flex-direction: row;
}

#progression-bar>li>a {
	color: white;
	justify-content: center;
	align-items: center;
	display: flex;
	height: 100%;
}

#progression-bar>li:first-child>a {
	border-radius: 5px 0 0 5px;
}

#progression-bar>li:last-child>a {
	border-radius: 0 5px 5px 0;
}
</style>