<template>
	<div id="progression-stats">
		<ul>
			<li v-for="stage in Object.keys(assignmentsBySRSStage).sort((a, b) => a - b)" :key="stage"
				:style="{ backgroundColor: srsStages[stage].color }">
				<div>
					<RouterLink :to="{ name: 'Reviews' }">
						{{ assignmentsBySRSStage[stage].length }}
					</RouterLink>
				</div>
			</li>
		</ul>
	</div>
</template>

<script>
import { RouterLink } from 'vue-router';
import { srsStages } from '@/utils/wanikani';

export default {
	name: 'SRSProgressionTiles',

	computed: {
		srsStages() {
			return srsStages;
		}
	},

	props: {
		assignmentsBySRSStage: {
			type: Object,
			default: () => ({})
		}
	}
}
</script>

<style scoped>
#progression-stats {
	padding: 7px;
}

#progression-stats>ul {
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	gap: 7px;
}

#progression-stats>ul>li {
	color: white;
	width: 100%;
	text-align: center;
	font-size: 25px;
	margin: 0 1px;
	position: relative;
	border-radius: 5px;
}

#progression-stats>ul>li>div:not(.progression-menu) {
	width: 100%;
	height: 70px;
}

#progression-stats a {
	color: white !important;
	display: flex;
	width: 100%;
	height: 100%;
	align-items: center;
	justify-content: center;
}
</style>