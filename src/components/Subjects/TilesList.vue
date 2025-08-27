<template>
	<ul class="tiles-list justify-list">
		<SubjectTile v-for="item in values" :key="item.id" :item="item"
			:style="{ backgroundColor: colors ? colors[item.type] : '' }" />
	</ul>
</template>

<script>
import SubjectTile from '@/components/Subjects/SubjectTile.vue';

export default {
	name: 'TilesList',
	components: {
		SubjectTile
	},

	props: {
		values: {
			type: Array,
			required: true
		},
		colors: {
			type: Object,
			required: true
		}
	},

	mounted() {
		this.$nextTick(() => {
			this.unjustifyLastRow(this.$el);
		});
	},

	methods: {
		unjustifyLastRow(list) {
			const lastRowTiles = Array.from(list.children).filter(tile => this.isLastRow(list, tile));
			const newWrapper = document.createElement("div");
			list.appendChild(newWrapper);
			lastRowTiles.forEach(tile => newWrapper.appendChild(tile));
		},
		isLastRow(list, tile) {
			const distanceToTop = tile.offsetTop + tile.offsetHeight + Number(getComputedStyle(tile)["margin-bottom"].replace("px", ""));
			return distanceToTop + tile.offsetHeight > list.offsetHeight;
		}
	}
}
</script>

<style scoped>
.tiles-list a {
	padding: 6px;
	display: inline-block;
	margin: 2px;
	text-shadow: -1px 1px 0px #737373;
	box-shadow: -1px 2px 0px 1px var(--default-color);
	border-radius: 6px;
	font-size: 20px;
	color: white;
	text-align: center;
}

.fill-width {
	grid-template-columns: repeat(auto-fill, minmax(35px, 1fr));
	display: grid;
}

.fill-width>a {
	padding: 6px 2px;
	text-align: center;
}

.justify-list {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	padding: 0;
	list-style-type: none;
	margin: 0;
	position: relative;
}

.justify-list>a {
	flex-grow: 1;
	text-align: center;
	justify-content: center;
}
</style>