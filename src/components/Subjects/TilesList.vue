<template>
	<!-- Large lists: render directly without dummy-list measurement. -->
	<ul v-if="useSimpleLayout" class="tiles-list justify-list">
		<SubjectTile
			v-for="item in values"
			:key="item.id"
			:item="item"
			:use-router="useRouter"
			:tile-style="tileStyle(item)"
			:invert-characters="tileInvert(item)"
			:show-reviews-info="showReviewsInfo"
			@click="onTileClick"
		/>
	</ul>
	<!-- Small lists: hidden dummy list + last-row split (v1.5-style). -->
	<template v-else>
		<ul class="tiles-list justify-list dummy-list" ref="dummyList" aria-hidden="true">
			<SubjectTile
				v-for="item in values"
				:key="item.id"
				:item="item"
				:use-router="useRouter"
				:tile-style="tileStyle(item)"
				:invert-characters="tileInvert(item)"
				:show-reviews-info="showReviewsInfo"
			/>
		</ul>
		<ul class="tiles-list justify-list">
			<SubjectTile
				v-for="item in tiles"
				:key="item.id"
				:item="item"
				:use-router="useRouter"
				:tile-style="tileStyle(item)"
				:invert-characters="tileInvert(item)"
				:show-reviews-info="showReviewsInfo"
				@click="onTileClick"
			/>
			<li v-if="lastRowTiles.length" class="last-row">
				<SubjectTile
					v-for="item in lastRowTiles"
					:key="item.id"
					:item="item"
					:use-router="useRouter"
					:tile-style="tileStyle(item)"
					:invert-characters="tileInvert(item)"
					:show-reviews-info="showReviewsInfo"
					@click="onTileClick"
				/>
			</li>
		</ul>
	</template>
</template>

<script>
import SubjectTile from '@/components/Subjects/SubjectTile.vue';

/** Above this count, skip the hidden dummy-list layout pass. */
const SIMPLE_LAYOUT_THRESHOLD = 120;

export default {
	name: 'TilesList',

	components: {
		SubjectTile,
	},

	props: {
		values: {
			type: Array,
			required: true,
		},
		colors: {
			type: Object,
			default: null,
		},
		tileStyles: {
			type: Object,
			default: null,
		},
		showReviewsInfo: {
			type: Boolean,
			default: false,
		},
		useRouter: {
			type: Boolean,
			default: true,
		},
	},

	emits: ['tile-click'],

	data() {
		return {
			tiles: [],
			lastRowTiles: [],
			resizeObserver: null,
			formatRetryTimer: null,
		};
	},

	computed: {
		useSimpleLayout() {
			return this.values.length > SIMPLE_LAYOUT_THRESHOLD;
		},
	},

	watch: {
		values: {
			handler() {
				if (this.useSimpleLayout) return;
				this.resetVisibleTiles();
				this.scheduleFormatList();
			},
			deep: true,
		},
		useSimpleLayout(isSimple) {
			if (isSimple) {
				this.disconnectObserver();
				return;
			}
			this.resetVisibleTiles();
			this.scheduleFormatList();
		},
	},

	mounted() {
		if (this.useSimpleLayout) return;
		this.resetVisibleTiles();
		this.scheduleFormatList();
		this.connectObserver();
	},

	beforeUnmount() {
		this.disconnectObserver();
		if (this.formatRetryTimer) clearTimeout(this.formatRetryTimer);
	},

	methods: {
		resetVisibleTiles() {
			this.tiles = [...this.values];
			this.lastRowTiles = [];
		},

		connectObserver() {
			if (typeof ResizeObserver === 'undefined') return;

			this.resizeObserver = new ResizeObserver(() => {
				this.scheduleFormatList();
			});

			this.$nextTick(() => {
				if (this.$refs.dummyList) {
					this.resizeObserver?.observe(this.$refs.dummyList);
				}
			});
		},

		disconnectObserver() {
			this.resizeObserver?.disconnect();
			this.resizeObserver = null;
		},

		scheduleFormatList() {
			if (this.useSimpleLayout) return;

			this.$nextTick(() => {
				requestAnimationFrame(() => {
					this.runFormatList();
				});
			});
		},

		scheduleFormatRetry() {
			if (this.formatRetryTimer) clearTimeout(this.formatRetryTimer);
			this.formatRetryTimer = setTimeout(() => {
				this.formatRetryTimer = null;
				this.runFormatList();
			}, 50);
		},

		runFormatList() {
			const list = this.$refs.dummyList;
			if (!list || !this.values.length) {
				this.resetVisibleTiles();
				return;
			}

			this.formatList(list);
		},

		tileStyle(item) {
			const options = this.tileStyles?.[item.id];
			if (options) {
				const style = {
					opacity: options.opacity ?? 1,
					color: options.color,
				};
				if (options.background) style.background = options.background;
				else if (options.backgroundColor) style.backgroundColor = options.backgroundColor;
				return style;
			}

			const type = item.type || item.subject_type;
			return { backgroundColor: this.colors?.[type] || '' };
		},

		tileInvert(item) {
			return this.tileStyles?.[item.id]?.invertCharacters ?? false;
		},

		onTileClick(item) {
			this.$emit('tile-click', item);
		},

		formatList(list) {
			const parentElem = list.closest('.subjects-list');
			if (parentElem) {
				const parentIsOverflowing = parentElem.scrollHeight > parentElem.clientHeight;
				const bodyIsOverflowing = document.body.scrollHeight > document.body.clientHeight
					|| document.documentElement.scrollHeight > document.documentElement.clientHeight;
				list.style.marginRight = parentIsOverflowing ? '65px' : bodyIsOverflowing ? '55px' : '45px';
			} else {
				list.style.marginRight = '45px';
			}

			if (list.offsetHeight <= 0 || list.offsetWidth <= 0) {
				this.resetVisibleTiles();
				this.scheduleFormatRetry();
				return;
			}

			const lastRow = Array.from(list.querySelectorAll('a')).filter(tile => this.isLastRow(list, tile));
			const valuesWithoutLastRow = this.values.filter(
				item => !lastRow.find(tile => parseInt(tile.getAttribute('data-item-id'), 10) === item.id),
			);
			const valuesLastRow = lastRow.map(tile => {
				const id = parseInt(tile.getAttribute('data-item-id'), 10);
				return this.values.find(item => item.id === id);
			}).filter(Boolean);

			this.lastRowTiles = valuesLastRow;
			this.tiles = valuesWithoutLastRow;
		},

		isLastRow(list, tile) {
			const distanceToTop = tile.offsetTop + tile.offsetHeight
				+ Number(getComputedStyle(tile).marginBottom.replace('px', '') || 0);
			return distanceToTop + tile.offsetHeight > list.offsetHeight;
		},
	},
};
</script>

<style scoped>
.tiles-list :deep(a) {
	padding: 8px 7px;
	display: inline-block;
	margin: 3px;
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

.fill-width :deep(a) {
	padding: 6px 2px;
	text-align: center;
}

.justify-list {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	padding: 8px 2px;
	list-style-type: none;
	margin: 0;
	position: relative;
}

.justify-list :deep(a) {
	flex-grow: 1;
	text-align: center;
	justify-content: center;
}

.dummy-list {
	position: absolute;
	left: 0;
	width: 100%;
	margin-right: 45px;
	top: -9999px;
	visibility: hidden;
	pointer-events: none;
}

.last-row {
	display: flex;
	flex-wrap: wrap;
	width: 100%;
	list-style: none;
	padding: 0;
	margin: 0;
}

.last-row :deep(a) {
	flex-grow: 0;
}
</style>
