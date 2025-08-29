<template>
	<ul id="progression-bar" :style="{ overflow: title ? 'visible' : 'hidden' }">
		<li v-for="entry in sorted(values)" :key="entry.id"
			:style="{ width: getStagePercentage(entry.items) + '%', backgroundColor: colors ? colors[entry.id] : '' }">
			<RouterLink :to="{ name: 'Subjects', query: { id: entry.id, type } }"
				:style="{ backgroundColor: colors ? colors[entry.id] : '' }">
				<span v-if="showPercentage(entry.items)">{{ getStagePercentage(entry.items) }}%</span>
			</RouterLink>
		</li>
		<div v-if="title && description" class="extra-info">
			<span class="title">{{ title }}</span>
			<div class="description" v-html="description"></div>
		</div>
	</ul>
</template>

<script>
import { RouterLink } from 'vue-router';

export default {
	name: 'ProgressionBar',

	computed: {
		totalAssignments() {
			return this.values.map(entry => entry.items.length).reduce((a, b) => a + b, 0);
		}
	},

	props: {
		values: {
			type: Object,
		},
		colors: {
			type: Object,
		},
		type: {
			type: String
		},
		sorting: {
			type: Object,
		},
		title: {
			type: String,
		},
		description: {
			type: String,
		}
	},

	methods: {
		getStagePercentage(items) {
			return ((items.length / this.totalAssignments) * 100).toFixed(1);
		},
		showPercentage(items) {
			const percentage = this.getStagePercentage(items);
			return percentage >= 10;
		},
		sorted(values) {
			if (this.sorting && Object.keys(this.sorting).length) {
				return values.sort((a, b) => this.sorting[a.id] - this.sorting[b.id]);
			}
			return values.sort((a, b) => a.id - b.id);
		}
	}
}
</script>

<style scoped>
#progression-bar {
	height: 25px;
	display: flex;
	flex-direction: row;
	position: relative;
	border-radius: 10px;
	overflow: hidden;
	padding-bottom: 5px;
}

#progression-bar>li {
	transition: width 0.2s;
}

#progression-bar>li>a {
	color: white;
	justify-content: center;
	align-items: center;
	display: flex;
	height: 100%;
}

.extra-info {
	position: absolute;
	bottom: -50px;
	background-color: white;
	display: flex;
	flex-direction: column;
	width: 96%;
	text-align: center;
}

.extra-info .title {
	font-weight: bold;
	background-color: var(--default-color);
	color: white;
	padding: 7px;
}

.extra-info .description {
	color: #666;
	padding: 5px;
	border: 1px solid #eee;
	border-bottom-left-radius: 5px;
	border-bottom-right-radius: 5px;
}
</style>