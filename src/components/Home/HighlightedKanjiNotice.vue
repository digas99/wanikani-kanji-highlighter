<template>
	<Transition name="highlight-notice">
		<!-- not a <button>: it holds a second action (the saved page) -->
		<div
			v-if="count > 0"
			role="button"
			tabindex="0"
			class="highlight-notice clickable"
			@click="$emit('click')"
			@keydown.enter.self="$emit('click')"
		>
			<!-- top right: the page in the history, or (no history) where to start keeping it -->
			<RouterLink
				v-if="savedUrl"
				:to="{ name: 'Page', query: { url: savedUrl } }"
				class="highlight-notice-saved"
				title="This page in Pages read: its level, kanji and sentences"
				@click.stop
			>Saved page ›</RouterLink>
			<RouterLink
				v-else-if="offerSave"
				:to="{ name: 'Settings', query: { tab: 'reading', section: 'pages-read', save: tabUrl } }"
				class="highlight-notice-saved"
				title="Turn on the history of pages read: this page is saved then"
				@click.stop
			>Save this page</RouterLink>

			<div class="highlight-notice-copy" :class="{ 'beside-pill': savedUrl || offerSave }">
				<strong>{{ label }}</strong>
				<span v-if="modeLabel" class="highlight-notice-mode">{{ modeLabel }}</span>
				<span class="highlight-notice-action">View highlighted list</span>
			</div>

			<!-- the subjects take a moment to load: a placeholder bar meanwhile -->
			<div v-if="barLoading" class="highlight-notice-skeleton" aria-label="Loading"></div>
			<div
				v-else-if="showProgressBar && barValues.length"
				class="highlight-notice-bar"
				aria-hidden="true"
			>
				<ProgressionBar
					:values="barValues"
					:colors="barColors"
					:sorting="barSorting"
				/>
			</div>
		</div>
	</Transition>
</template>

<script>
import { RouterLink } from 'vue-router';
import ProgressionBar from '@/components/Home/ProgressionBar.vue';
import { useSettingsStore } from '@/stores/settings';
import { getActiveBrowserTab } from '@/utils/scripts/activeBrowserTab';
import { pageKey, readPageHistory, watchPageHistory } from '@/utils/scripts/pageHistory';

export default {
	name: 'HighlightedKanjiNotice',

	components: {
		ProgressionBar,
		RouterLink,
	},

	data() {
		return {
			/** the active tab's page, as the history keys it */
			tabUrl: '',
			historyUrls: new Set(),
		};
	},

	props: {
		count: {
			type: Number,
			default: 0,
		},
		modeLabel: {
			type: String,
			default: '',
		},
		showProgressBar: {
			type: Boolean,
			default: false,
		},
		/** the bar's subjects are still loading */
		barLoading: {
			type: Boolean,
			default: false,
		},
		barValues: {
			type: Array,
			default: () => [],
		},
		barColors: {
			type: Object,
			default: () => ({}),
		},
		barSorting: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['click'],

	computed: {
		label() {
			const noun = this.count === 1 ? 'subject' : 'subjects';
			return `${this.count} highlighted ${noun} on this page`;
		},
		/** the page is in the history: its address there */
		savedUrl() {
			return this.tabUrl && this.historyUrls.has(this.tabUrl) ? this.tabUrl : '';
		},
		/** no history kept: the way to turn it on (this page is saved then) */
		offerSave() {
			return Boolean(this.tabUrl) && useSettingsStore().settings.page_stats?.history !== true;
		},
	},

	async created() {
		const setHistory = entries => { this.historyUrls = new Set(entries.map(entry => entry.url)); };
		try {
			const [tab, entries] = await Promise.all([getActiveBrowserTab(), readPageHistory()]);
			if (tab?.url && /^https?:/.test(tab.url)) this.tabUrl = pageKey(tab.url);
			setHistory(entries);
			// recorded a moment later (the page was still loading): the link appears
			this.unwatch = watchPageHistory(setHistory);
		} catch {
			// no history: no link
		}
	},

	beforeUnmount() {
		this.unwatch?.();
	},
};
</script>

<style scoped>
.highlight-notice {
	position: fixed;
	left: calc(10px + var(--frame-left, 0px));
	right: calc(10px + var(--frame-right, 0px));
	bottom: 10px;
	z-index: 99;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 8px;
	width: calc(100% - 60px);
	padding: 12px 14px;
	border: 1px solid var(--surface-border-color);
	border-radius: 10px;
	background: var(--fill-color);
	box-shadow: 0 4px 18px var(--shadow-soft-color);
	color: var(--heading-color, #2a2d48);
	text-align: left;
	cursor: pointer;
}

.highlight-notice-copy {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 2px;
}

.highlight-notice strong {
	font-size: 13px;
}

/* the title clear of the pill in the corner */
.highlight-notice-copy.beside-pill strong {
	padding-right: 110px;
}

.highlight-notice-mode {
	font-size: 11px;
	color: var(--font-sec-color);
}

.highlight-notice-action {
	font-size: 11px;
	color: var(--wanikani);
}

/* a pill of its own, in the top right corner: it opens something else than the notice does */
.highlight-notice-saved {
	position: absolute;
	top: 10px;
	right: 12px;
	font-size: 11px;
	color: var(--wanikani);
	padding: 2px 9px;
	border: 1px solid color-mix(in srgb, var(--wanikani) 45%, transparent);
	border-radius: 999px;
	font-weight: 700;
	text-decoration: none;
	transition: background-color 0.15s;
}

.highlight-notice-saved:hover {
	opacity: 1;
	background: color-mix(in srgb, var(--wanikani) 12%, transparent);
}

.highlight-notice-bar {
	pointer-events: none;
}

/* the bar's place while it loads: a light sweep over a gray bar of its size */
.highlight-notice-skeleton {
	height: 20px;
	border-radius: 5px;
	background:
		linear-gradient(90deg, transparent 0, color-mix(in srgb, var(--fill-color) 65%, transparent) 50%, transparent 100%) no-repeat,
		var(--surface-muted-color);
	background-size: 40% 100%, 100% 100%;
	animation: highlight-notice-sweep 1.2s ease-in-out infinite;
}

@keyframes highlight-notice-sweep {
	from { background-position: -60% 0, 0 0; }
	to { background-position: 160% 0, 0 0; }
}

@media (prefers-reduced-motion: reduce) {
	.highlight-notice-skeleton { animation: none; }
}

.highlight-notice-bar :deep(#progression-bar) {
	height: 20px;
	padding-bottom: 0;
}

.highlight-notice-bar :deep(#progression-bar > li > a),
.highlight-notice-bar :deep(#progression-bar > li > .progression-bar-action) {
	font-size: 10px;
}

.highlight-notice-enter-active,
.highlight-notice-leave-active {
	transition: opacity 0.2s ease, transform 0.2s ease;
}

.highlight-notice-enter-from,
.highlight-notice-leave-to {
	opacity: 0;
	transform: translateY(8px);
}
</style>

<style>
.highlight-notice-bar #progression-bar > li:first-child,
.highlight-notice-bar #progression-bar > li:first-child > a {
	border-radius: 5px 0 0 5px;
}

.highlight-notice-bar #progression-bar > li:last-child,
.highlight-notice-bar #progression-bar > li:last-child > a {
	border-radius: 0 5px 5px 0;
}
</style>
