<template>
	<!--
		Rows are justified (tiles stretch to fill the width); the last row keeps the tiles'
		natural width. That's done in CSS (a filler at the end, see .justify-list::after), so
		it's right at any width and needs no measuring.
	-->
	<ul class="tiles-list justify-list">
		<SubjectTile
			v-for="item in shownValues"
			:key="item.id"
			:item="item"
			:use-router="useRouter"
			:tile-style="tileStyle(item)"
			:invert-characters="tileInvert(item)"
			:show-reviews-info="showReviewsInfo"
			:show-meaning="showMeaning"
			:show-trouble="showTrouble"
			@click="onTileClick"
		/>
		<!-- more to draw: they come as this nears the screen -->
		<li v-if="shown < values.length" ref="more" class="tiles-more" aria-hidden="true"></li>
	</ul>
</template>

<script>
import SubjectTile from '@/components/Subjects/SubjectTile.vue';
import { tileLoadingPausedFor } from '@/utils/scripts/tileLoading';

/**
 * Long lists (thousands of tiles: all the locked subjects) are drawn as they're scrolled to:
 * the first ones right away, the next batch when the end of what's drawn nears the screen.
 */
const FIRST_TILES = 240;
const TILES_PER_BATCH = 240;

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
		showMeaning: {
			type: Boolean,
			default: false,
		},
		/** the trouble subjects' circle (a list's menu → Trouble info) */
		showTrouble: {
			type: Boolean,
			default: true,
		},
		useRouter: {
			type: Boolean,
			default: true,
		},
	},

	emits: ['tile-click'],

	data() {
		return { shown: FIRST_TILES };
	},

	computed: {
		shownValues() {
			return this.values.length <= this.shown ? this.values : this.values.slice(0, this.shown);
		},
	},

	watch: {
		values: {
			immediate: true,
			handler(values, previous) {
				// another list (not the same one updated): from the start again
				if (!previous || values.length < this.shown) this.shown = FIRST_TILES;
				this.$nextTick(this.watchMore);
			},
		},
	},

	beforeUnmount() {
		this.moreObserver?.disconnect();
		clearTimeout(this.moreTimer);
	},

	methods: {
		/**
		 * The end marker on the screen, or just below it: the next batch. Never ahead above the
		 * screen: tiles added there would push what's being looked at down (a section jumped to,
		 * from the list's bar, kept moving away).
		 */
		watchMore() {
			this.moreObserver?.disconnect();
			clearTimeout(this.moreTimer);
			const marker = this.$refs.more;
			if (!marker) return;
			this.moreObserver = new IntersectionObserver(entries => {
				if (!entries.some(entry => entry.isIntersecting)) return;
				// the list is jumping to a section: once it's there, look again
				const paused = tileLoadingPausedFor();
				if (paused) {
					this.moreObserver?.disconnect();
					this.moreTimer = setTimeout(() => this.watchMore(), paused + 20);
					return;
				}
				this.shown += TILES_PER_BATCH;
				// still in view (a tall window): again, once drawn
				this.$nextTick(this.watchMore);
			}, { rootMargin: '0px 0px 600px 0px' });
			this.moreObserver.observe(marker);
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
	},
};
</script>

<style scoped>
/* the marker for more tiles: its own (invisible) row at the end */
.tiles-more {
	flex: 0 0 100%;
	height: 1px;
	list-style: none;
}

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
	list-style-type: none;
	margin: 0;
	position: relative;
}

.justify-list :deep(a) {
	flex-grow: 1;
	text-align: center;
	justify-content: center;
}

/* Last-row filler: it only shares a line with the last row, and grows 1000x faster
   than the tiles there, so it takes the leftover space instead of stretching them. */
.justify-list::after {
	content: '';
	flex-grow: 1000;
}
</style>
