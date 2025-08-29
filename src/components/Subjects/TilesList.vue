<template>
	<!-- dummy list to make calculations -->
	<ul class="tiles-list justify-list dummy-list" ref="dummyList">
		<SubjectTile v-for="item in values" :key="item.id" :item="item"
			:style="{ backgroundColor: colors ? colors[item.type] : '' }" />
	</ul>
	<!-- actual list with tiles correctly distributed -->
	<ul class="tiles-list justify-list">
		<SubjectTile v-for="item in tiles" :key="item.id" :item="item"
			:style="{ backgroundColor: colors ? colors[item.type] : '' }" />
		<div class="last-row" ref="lastRow">
			<SubjectTile v-for="item in lastRowTiles" :key="item.id" :item="item"
				:style="{ backgroundColor: colors ? colors[item.type] : '' }" />
		</div>
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

	data() {
		return {
			tiles: [],
			lastRowTiles: []
		}
	},

	watch: {
		values: {
			handler() {
				this.$nextTick(() => {
					this.formatList(this.$refs.dummyList);
				});
			},
			deep: true
		}
	},

	mounted() {
		this.$nextTick(() => {
			this.formatList(this.$refs.dummyList);
		});
	},

	methods: {
		formatList(list) {
			const parentElem = list.closest(".subjects-list");
			const parentIsOverflowing = parentElem.scrollHeight > parentElem.clientHeight;
			list.style.marginRight = parentIsOverflowing ? "65px" : "45px";

			const lastRow = Array.from(list.querySelectorAll("a")).filter(tile => this.isLastRow(list, tile));
			const valuesWithoutLastRow = this.values.filter(item => !lastRow.find(tile => parseInt(tile.getAttribute("data-item-id")) === item.id));
			const valuesLastRow = lastRow.map(tile => {
				const id = parseInt(tile.getAttribute("data-item-id"));
				return this.values.find(item => item.id === id);
			});
			this.lastRowTiles = valuesLastRow;
			this.tiles = valuesWithoutLastRow;
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

.dummy-list {
	position: absolute;
	margin-right: 45px;
	top: -9999px;
}
</style>