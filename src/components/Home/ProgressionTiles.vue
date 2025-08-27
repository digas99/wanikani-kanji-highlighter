<template>
	<div id="progression-stats">
		<ul>
			<li v-for="entry in sorted(values)" :key="entry.id" @mouseover="handleMouseOver(entry)" :data-id="entry.id"
				:style="{ backgroundColor: colors ? colors[entry.id] : '' }"
				:data-color="colors ? colors[entry.id] : ''">
				<div>
					<RouterLink :to="{ name: 'Subjects', query: { id: entry.id, type } }">
						{{ entry.items.length }}
					</RouterLink>
				</div>
			</li>
		</ul>
	</div>
</template>

<script>
import { RouterLink } from 'vue-router';

export default {
	name: 'ProgressionTiles',

	props: {
		values: {
			type: Object
		},
		colors: {
			type: Object
		},
		sorting: {
			type: Object
		},
		type: {
			type: String
		}
	},

	methods: {
		sorted(values) {
			if (this.sorting) {
				return Object.keys(this.sorting).map(key => values[key]);
			}
			return values.sort((a, b) => a.id - b.id);
		},
		handleMouseOver(entry) {
			this.$emit('mouseover', entry.items);

			// add background color gray to all others
			const allEntries = this.$el.querySelectorAll('li');
			allEntries.forEach(item => {
				if (item.dataset.id != entry.id) {
					item.style.backgroundColor = 'gray';
				}
				else {
					item.style.backgroundColor = item.dataset.color;
				}
			});
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

#progression-stats a:hover {
	opacity: 1;
}
</style>