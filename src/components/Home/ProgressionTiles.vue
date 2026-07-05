<template>
	<div id="progression-stats">
		<ul>
			<li
				v-for="entry in sorted(values)"
				:key="entry.id"
				:data-id="entry.id"
				:style="{ backgroundColor: colors ? colors[entry.id] : '' }"
			>
				<RouterLink :to="{ name: 'Subjects', query: { id: entry.id, type } }">
					{{ entry.items.length }}
				</RouterLink>
			</li>
		</ul>
	</div>
</template>

<script>
import { RouterLink } from 'vue-router';

export default {
	name: 'ProgressionTiles',

	components: {
		RouterLink,
	},

	props: {
		values: {
			type: Object,
		},
		colors: {
			type: Object,
		},
		sorting: {
			type: Object,
		},
		type: {
			type: String,
		},
	},

	methods: {
		sorted(values) {
			if (this.sorting) {
				return Object.keys(this.sorting).map(key => values[key]);
			}
			return values.sort((a, b) => a.id - b.id);
		},
	},
};
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
	width: 100%;
	border-radius: 5px;
	overflow: hidden;
}

#progression-stats a {
	color: white !important;
	display: flex;
	width: 100%;
	height: 70px;
	align-items: center;
	justify-content: center;
	font-size: 25px;
	transition: 0.2s;
}
</style>
