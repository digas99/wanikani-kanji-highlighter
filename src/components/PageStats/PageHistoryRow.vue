<template>
	<!-- a page read, Todaii-like: level, title, the bar, where and when, % learned -->
	<component :is="to ? 'RouterLink' : 'div'" :to="to" class="page-history-row" :class="{ link: Boolean(to) }">
		<span
			class="page-history-level"
			:class="{ word: view === 'learned' || view === 'srs' }"
			:style="{ background: badge.color }"
			:title="badge.title"
		>{{ badge.text }}</span>
		<span class="page-history-main">
			<span class="page-history-title">{{ entry.title }}</span>
			<PageStatsSegments :segments="segments" />
			<span class="page-history-meta">
				<span class="page-history-where">
					<!-- rated on the chosen parts, not the whole page -->
					<span v-if="entry.stats.partial" class="page-history-partial" title="Only the chosen parts of the page were rated">
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3" />
							<rect x="7.5" y="7.5" width="9" height="9" rx="1" />
						</svg>
						Part of page
					</span>
					<!-- sentences kept from it (Keep example sentences) -->
					<span
						v-if="entry.sentences?.length"
						class="page-history-partial page-history-sentences"
						:title="`${entry.sentences.length} ${entry.sentences.length === 1 ? 'sentence' : 'sentences'} kept from this page`"
					>
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M4 5h16v11H9l-5 4z" />
							<path d="M8 9h8M8 12.5h5" />
						</svg>
						{{ entry.sentences.length }} {{ entry.sentences.length === 1 ? 'sentence' : 'sentences' }}
					</span>
					<span class="page-history-host">{{ entry.host }}</span>
				</span>
				<span>{{ when }}</span>
			</span>
		</span>
		<span class="page-history-percent" :title="badge.title">
			<b>{{ badge.percent }}%</b>
			<!-- Learned / SRS: the badge already says the rating -->
			<small :style="{ color: badge.rating.color }">{{ view === 'srs' ? 'by SRS' : view === 'learned' ? 'learned' : badge.rating.label }}</small>
		</span>
	</component>
</template>

<script>
import PageStatsSegments from '@/components/PageStats/PageStatsSegments.vue';
import { barSegments, pageBadge } from '@/utils/scripts/pageStats';
import { notificationTime } from '@/utils/scripts/notifications';

export default {
	name: 'PageHistoryRow',

	components: {
		PageStatsSegments,
	},

	props: {
		/** a PageHistoryEntry */
		entry: {
			type: Object,
			required: true,
		},
		view: {
			type: String,
			default: 'jlpt',
		},
		appearance: {
			type: Object,
			default: () => ({}),
		},
		/** where clicking goes (none: not a link, e.g. an example) */
		to: {
			type: Object,
			default: null,
		},
		/** shown instead of the time since the visit */
		whenLabel: {
			type: String,
			default: '',
		},
	},

	computed: {
		segments() {
			return barSegments(this.entry.stats, this.view, this.appearance);
		},
		/** the view's classification: a level (JLPT / Jōyō) or a reading ease (Learned / SRS) */
		badge() {
			return pageBadge(this.entry.stats, this.view);
		},
		when() {
			return this.whenLabel || notificationTime(this.entry.at);
		},
	},
};
</script>

<style scoped>
.page-history-row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px;
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.06);
	color: #fff;
	text-align: left;
	transition: background-color 0.15s;
}

.page-history-row.link:hover {
	opacity: 1;
	background: rgba(255, 255, 255, 0.11);
}

.page-history-level {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: 8px;
	font-size: 14px;
	font-weight: 800;
	color: #fff;
}

/* a reading ease (Comfortable…) instead of a level: wider, smaller */
.page-history-level.word {
	width: 76px;
	font-size: 10.5px;
	letter-spacing: 0.02em;
}

.page-history-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.page-history-title {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	font-size: 13px;
	font-weight: 700;
	line-height: 1.35;
}

.page-history-meta {
	display: flex;
	justify-content: space-between;
	gap: 8px;
	font-size: 11px;
	color: #b3b6cc;
}

.page-history-where {
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 6px;
}

.page-history-partial {
	flex-shrink: 0;
	display: inline-flex;
	align-items: center;
	gap: 3px;
	padding: 1px 6px 1px 4px;
	border-radius: 999px;
	background: rgba(227, 111, 148, 0.16);
	font-size: 10px;
	font-weight: 700;
	color: #f19bb8;
}

.page-history-partial svg {
	width: 11px;
	height: 11px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2.2;
}

/* sentences kept: as "Part of page", in a cooler colour */
.page-history-sentences {
	background: rgba(0, 170, 255, 0.14);
	color: #7cc8f2;
}

.page-history-host {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.page-history-percent {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 1px;
	font-size: 14px;
}

.page-history-percent small {
	font-size: 10.5px;
	font-weight: 700;
}
</style>
