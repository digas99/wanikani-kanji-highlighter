<template>
	<!-- the page's reading level, bottom left (the details popup is bottom right) -->
	<div
		v-if="state.showBar && stats"
		class="wkh-ps-root"
		:class="{ expanded: state.expanded }"
		@mouseenter="preview(true)"
		@mouseleave="preview(false)"
	>
		<div v-if="state.expanded" class="wkh-ps-panel" role="dialog" aria-label="Reading level of this page">
			<header class="wkh-ps-head">
				<span class="wkh-ps-level" :class="{ word: isWord(badge) }" :style="{ background: badge.color }" :title="badge.title">{{ badge.text }}</span>
				<span class="wkh-ps-summary">
					<span>
						<b>{{ badge.percent }}%</b> {{ state.view === 'srs' ? 'known, by SRS' : 'learned' }} ·
						<span :style="{ color: badge.rating.color }">{{ badge.rating.label }}</span>
					</span>
					<small>
						{{ unitsText }} · {{ counts.notLearned }} not learned yet
						<template v-if="stats.partial"> · <span class="wkh-ps-partial-text">chosen parts only</span></template>
					</small>
				</span>
				<button type="button" class="wkh-ps-icon" aria-label="Close" @click="close">×</button>
			</header>
			<button
				v-for="row in rows"
				:key="row.id"
				type="button"
				class="wkh-ps-row"
				:class="{ chosen: row.id === state.view }"
				:title="row.id === state.view ? 'Shown on the closed bar' : 'Show this on the closed bar'"
				@click="choose(row.id)"
			>
				<span class="wkh-ps-row-head">
					<span class="wkh-ps-row-label">{{ row.label }}</span>
					<!-- this view's classification -->
					<span class="wkh-ps-row-badge" :style="{ background: row.badge.color }" :title="row.badge.title">{{ row.badge.text }}</span>
				</span>
				<span class="wkh-ps-bar">
					<span
						v-for="segment in row.segments"
						:key="segment.key"
						:style="{ flexGrow: segment.count, background: segment.color }"
						:title="`${segment.label}: ${segment.count}`"
					></span>
				</span>
				<span class="wkh-ps-legend">
					<span v-for="segment in row.segments" :key="segment.key">
						<span class="wkh-ps-dot" :style="{ background: segment.color }"></span>{{ segment.label }} <b>{{ segment.count }}</b>
					</span>
				</span>
			</button>
			<!-- rate only some parts of this site's pages (the highlighting stays everywhere) -->
			<div class="wkh-ps-parts">
				<span class="wkh-ps-row-label">Rated part</span>
				<p v-if="!state.sections.length" class="wkh-ps-parts-note">The whole page.</p>
				<p v-else class="wkh-ps-parts-note">
					<template v-if="state.sectionsFound">Only the chosen parts ({{ state.sectionsFound }} on this page).</template>
					<template v-else>The whole page: none of the chosen parts are on it.</template>
				</p>
				<ul v-if="state.sections.length" class="wkh-ps-parts-list">
					<li v-for="selector in state.sections" :key="selector">
						<code :title="selector">{{ selector }}</code>
						<button type="button" class="wkh-ps-icon" :aria-label="`Remove ${selector}`" @click="removePart(selector)">×</button>
					</li>
				</ul>
				<button
					v-if="state.sectionsFound"
					type="button"
					class="wkh-ps-focus-switch"
					role="switch"
					:aria-checked="state.focus"
					@click="toggleFocus"
				>
					<span>
						Focus on them
						<small>Dims the rest of the page{{ state.focus ? ' · Esc to leave' : '' }}</small>
					</span>
					<span class="wkh-ps-switch" :class="{ on: state.focus }"></span>
				</button>
				<div class="wkh-ps-parts-actions">
					<button type="button" class="wkh-ps-button" @click="pick">{{ state.sections.length ? 'Add parts…' : 'Choose parts…' }}</button>
					<button v-if="state.sections.length" type="button" class="wkh-ps-link" @click="clearParts">Use the whole page</button>
				</div>
			</div>
			<footer class="wkh-ps-foot">
				<button type="button" @click="hide">Hide on this site</button>
			</footer>
		</div>

		<!-- choosing parts: the element under the pointer, and what to do -->
		<!-- focus: the page dimmed, with windows on the chosen parts (clicks go through) -->
		<svg v-if="state.focus && state.chosenBoxes.length" class="wkh-ps-focus" aria-hidden="true">
			<defs>
				<mask id="wkh-ps-focus-mask">
					<rect x="0" y="0" width="100%" height="100%" fill="#fff" />
					<rect
						v-for="(box, index) in state.chosenBoxes"
						:key="index"
						:x="box.left - FOCUS_PADDING"
						:y="box.top - FOCUS_PADDING"
						:width="box.width + FOCUS_PADDING * 2"
						:height="box.height + FOCUS_PADDING * 2"
						rx="8"
						fill="#000"
					/>
				</mask>
			</defs>
			<rect x="0" y="0" width="100%" height="100%" mask="url(#wkh-ps-focus-mask)" />
		</svg>
		<!-- the parts rated (dotted): while choosing them, or while the bar is hovered -->
		<div
			v-for="(box, index) in (state.picking || state.previewing) ? state.chosenBoxes : []"
			:key="index"
			class="wkh-ps-pick-outline chosen"
			:style="boxStyle(box)"
		></div>
		<template v-if="state.picking">
			<div
				v-if="state.pickBox"
				class="wkh-ps-pick-outline"
				:class="{ removes: state.pickRemoves }"
				:style="boxStyle(state.pickBox)"
			>
				<span v-if="state.pickRemoves" class="wkh-ps-pick-tag">Click to remove</span>
			</div>
			<div class="wkh-ps-pick-bar" role="status">
				<span>
					<b>Click the parts of the page to rate</b>, e.g. the article's text; click a
					chosen one again to remove it. They're used on all pages of {{ host }} that have them.
					<template v-if="state.chosenBoxes.length"> · <b>{{ state.chosenBoxes.length }} chosen</b></template>
				</span>
				<button type="button" class="wkh-ps-button" @click="donePicking">Done</button>
			</div>
		</template>

		<div class="wkh-ps-pill-row">
		<button type="button" class="wkh-ps-pill" :title="pillTitle" @click="state.expanded = !state.expanded">
			<span class="wkh-ps-level" :class="{ word: isWord(badge) }" :style="{ background: badge.color }">{{ badge.text }}</span>
			<span class="wkh-ps-bar">
				<span
					v-for="segment in pillSegments"
					:key="segment.key"
					:style="{ flexGrow: segment.count, background: segment.color }"
				></span>
			</span>
			<span class="wkh-ps-percent">{{ badge.percent }}%</span>
			<!-- rated on the chosen parts, not the whole page -->
			<svg v-if="stats.partial" class="wkh-ps-partial" viewBox="0 0 24 24" aria-label="Chosen parts only">
				<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3" />
				<rect x="7.5" y="7.5" width="9" height="9" rx="1" />
			</svg>
		</button>
		<!-- focus on the chosen parts (only when they're on this page) -->
		<button
			v-if="state.sectionsFound"
			type="button"
			class="wkh-ps-focus-button"
			:class="{ on: state.focus }"
			:aria-pressed="state.focus"
			:title="state.focus ? 'Leave focus (Esc)' : 'Focus: dim everything but the chosen parts'"
			@click="toggleFocus"
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
				<circle cx="12" cy="12" r="3" />
			</svg>
		</button>
		</div>
	</div>
</template>

<script>
import {
	clearSections,
	hideOnThisSite,
	pageStatsState,
	previewSections,
	removeSection,
	setFocus,
	setPageStatsView,
	startPicking,
	stopPicking,
} from '@/utils/highlight/pageStatsBar';
import { barSegments, PAGE_STATS_VIEWS, pageBadge, unitCounts, unitsText } from '@/utils/scripts/pageStats';

/** room around the chosen parts' windows, in focus */
const FOCUS_PADDING = 8;

export default {
	name: 'PageStatsBar',

	data() {
		return { state: pageStatsState, FOCUS_PADDING };
	},

	computed: {
		stats() {
			return this.state.stats;
		},
		counts() {
			return unitCounts(this.stats);
		},
		/** "68 different kanji", or "43 words · 12 kanji" (Words / Mixed) */
		unitsText() {
			return unitsText(this.stats);
		},
		/** The classification of the view shown on the closed bar. */
		badge() {
			return pageBadge(this.stats, this.state.view);
		},
		rows() {
			return PAGE_STATS_VIEWS.map(view => ({
				...view,
				segments: barSegments(this.stats, view.id, this.state.appearance),
				badge: pageBadge(this.stats, view.id),
			}));
		},
		pillSegments() {
			return barSegments(this.stats, this.state.view, this.state.appearance);
		},
		host() {
			return location.hostname;
		},
		pillTitle() {
			const where = this.stats.partial ? ' (the chosen parts of this page)' : '';
			return `${this.badge.title}${where}. Click for details`;
		},
	},

	methods: {
		/** a rating (Comfortable) rather than a level (N3): a smaller font */
		isWord(badge) {
			return badge.text.length > 3;
		},
		choose(view) {
			void setPageStatsView(view);
		},
		/** The panel goes from under the pointer (no mouseleave): the outlines go too. */
		close() {
			this.state.expanded = false;
			previewSections(false);
		},
		hide() {
			this.close();
			void hideOnThisSite();
		},
		pick() {
			startPicking();
		},
		preview(on) {
			previewSections(on);
		},
		toggleFocus() {
			setFocus(!this.state.focus);
		},
		boxStyle(box) {
			return { top: `${box.top}px`, left: `${box.left}px`, width: `${box.width}px`, height: `${box.height}px` };
		},
		donePicking() {
			stopPicking();
		},
		removePart(selector) {
			void removeSection(selector);
		},
		clearParts() {
			void clearSections();
		},
	},
};
</script>

<style>
/*
 * Our host element is reset to static (WXT), so the root stacks in the page's own context:
 * it needs the top z-index, or a site's sticky header covers it. Inside it: the outlines
 * under the panel and the pill, the picker's bar over everything.
 */
.wkh-ps-root {
	z-index: 2147483646;
}

.wkh-ps-focus {
	z-index: 0;
}

.wkh-ps-pick-outline {
	z-index: 1;
}

.wkh-ps-panel,
.wkh-ps-pill-row {
	position: relative;
	z-index: 2;
}

/* focus: the page dimmed around the chosen parts; clicks and scrolling go to the page */
.wkh-ps-focus {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	pointer-events: none;
	fill: rgba(12, 13, 26, 0.62);
}

.wkh-ps-pill-row {
	display: flex;
	align-items: center;
	gap: 6px;
}

.wkh-ps-focus-button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 50%;
	background: rgba(42, 45, 72, 0.95);
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
	cursor: pointer;
	opacity: 0.85;
	transition: opacity 0.15s, background-color 0.15s;
}

.wkh-ps-focus-button:hover {
	opacity: 1;
}

.wkh-ps-focus-button.on {
	border-color: #e36f94;
	background: #e36f94;
	opacity: 1;
}

.wkh-ps-focus-button svg {
	width: 17px;
	height: 17px;
	fill: none;
	stroke: #fff;
	stroke-width: 2;
	stroke-linecap: round;
}

.wkh-ps-focus-switch {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	width: 100%;
	padding: 6px 0;
	border: none;
	background: transparent;
	text-align: left;
	cursor: pointer;
}

.wkh-ps-focus-switch > span:first-child {
	display: flex;
	flex-direction: column;
	gap: 1px;
	font-size: 12.5px;
	font-weight: 700;
}

.wkh-ps-focus-switch small {
	font-size: 10.5px;
	font-weight: 400;
	color: #aeb1c6;
}

.wkh-ps-switch {
	position: relative;
	flex-shrink: 0;
	width: 32px;
	height: 18px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.2);
	transition: background-color 0.15s;
}

.wkh-ps-switch::after {
	content: '';
	position: absolute;
	top: 2px;
	left: 2px;
	width: 14px;
	height: 14px;
	border-radius: 50%;
	background: #fff;
	transition: transform 0.15s;
}

.wkh-ps-switch.on {
	background: #e36f94;
}

.wkh-ps-switch.on::after {
	transform: translateX(14px);
}

.wkh-ps-pick-bar {
	z-index: 3;
}

.wkh-ps-root {
	position: fixed;
	left: 14px;
	bottom: 14px;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 8px;
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 13px;
	line-height: 1.3;
	color: #ececf3;
	text-align: left;
}

.wkh-ps-root button {
	font-family: inherit;
	color: inherit;
}

.wkh-ps-pill {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 5px 10px 5px 5px;
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 999px;
	/* the extension's navy (popup --default-color) */
	background: rgba(42, 45, 72, 0.95);
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
	cursor: pointer;
	opacity: 0.85;
	transition: opacity 0.15s, transform 0.15s;
}

.wkh-ps-pill:hover,
.wkh-ps-root.expanded .wkh-ps-pill {
	opacity: 1;
}

.wkh-ps-pill .wkh-ps-bar {
	width: 110px;
}

.wkh-ps-level {
	flex-shrink: 0;
	padding: 2px 7px;
	border-radius: 6px;
	color: #fff;
	font-size: 12px;
	font-weight: 800;
}

/* a thin bar of segments (Todaii-like) */
.wkh-ps-bar {
	display: flex;
	height: 6px;
	border-radius: 999px;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.12);
}

.wkh-ps-bar > span {
	min-width: 2px;
}

.wkh-ps-percent {
	font-size: 12px;
	font-weight: 800;
}

/* only the chosen parts were rated */
.wkh-ps-partial {
	width: 15px;
	height: 15px;
	margin-left: -2px;
	fill: none;
	stroke: #e36f94;
	stroke-width: 2;
}

.wkh-ps-partial-text {
	font-weight: 700;
	color: #e36f94;
}

.wkh-ps-panel {
	/* room for "617 words · 911 kanji · 667 not learned yet" on one line */
	width: min(340px, calc(100vw - 24px));
	padding: 10px;
	box-sizing: border-box;
	/* like Home's hero card */
	border: 1px solid rgba(255, 255, 255, 0.06);
	border-radius: 12px;
	background-color: #2a2d48;
	background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0));
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}

.wkh-ps-head {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	margin-bottom: 6px;
}

.wkh-ps-head .wkh-ps-level {
	font-size: 15px;
	padding: 4px 8px;
}

.wkh-ps-summary {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 1px;
	font-size: 13px;
	font-weight: 700;
}

.wkh-ps-summary small {
	font-size: 11px;
	font-weight: 400;
	color: #aeb1c6;
}

.wkh-ps-icon {
	width: 24px;
	height: 24px;
	padding: 0;
	border: none;
	border-radius: 6px;
	background: transparent;
	font-size: 18px;
	line-height: 1;
	cursor: pointer;
}

.wkh-ps-icon:hover {
	background: rgba(255, 255, 255, 0.1);
}

.wkh-ps-row {
	display: flex;
	flex-direction: column;
	gap: 4px;
	width: 100%;
	margin-top: 6px;
	padding: 8px 10px;
	/* the hero card's inner tiles */
	border: 1px solid rgba(255, 255, 255, 0.06);
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.05);
	text-align: left;
	cursor: pointer;
	transition: background-color 0.15s, border-color 0.15s;
}

.wkh-ps-row:hover {
	background: rgba(255, 255, 255, 0.09);
}

/* shown on the closed bar: the extension's light pink (its section pills) */
.wkh-ps-row.chosen {
	border-color: #e36f94;
	background: rgba(227, 111, 148, 0.12);
}

.wkh-ps-level.word {
	font-size: 10.5px;
	letter-spacing: 0.02em;
}

.wkh-ps-head .wkh-ps-level.word {
	align-self: center;
	font-size: 11.5px;
}

.wkh-ps-row-head {
	/* inside a button: it doesn't stretch by itself */
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.wkh-ps-row-badge {
	padding: 1px 7px;
	border-radius: 5px;
	font-size: 10.5px;
	font-weight: 800;
	color: #fff;
}

.wkh-ps-row-label {
	font-size: 11px;
	font-weight: 800;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: #aeb1c6;
}

.wkh-ps-row .wkh-ps-bar {
	width: 100%;
	height: 8px;
}

.wkh-ps-legend {
	display: flex;
	flex-wrap: wrap;
	gap: 2px 10px;
	font-size: 10.5px;
	color: #a9acc2;
}

/* the count stands out from its label */
.wkh-ps-legend b {
	margin-left: 1px;
	font-weight: 800;
	color: #fff;
}

.wkh-ps-legend .wkh-ps-dot {
	display: inline-block;
	width: 7px;
	height: 7px;
	margin-right: 4px;
	border-radius: 2px;
}

.wkh-ps-parts {
	display: flex;
	flex-direction: column;
	gap: 5px;
	margin-top: 6px;
	padding: 8px 10px;
	border: 1px solid rgba(255, 255, 255, 0.06);
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.05);
}

.wkh-ps-parts-note {
	margin: 0;
	font-size: 11.5px;
	color: #c9cbdb;
}

.wkh-ps-parts-list {
	display: flex;
	flex-direction: column;
	gap: 3px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.wkh-ps-parts-list li {
	display: flex;
	align-items: center;
	gap: 4px;
}

.wkh-ps-parts-list code {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	padding: 2px 6px;
	border-radius: 5px;
	background: rgba(0, 0, 0, 0.2);
	font-family: ui-monospace, Consolas, monospace;
	font-size: 10.5px;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: #e6e7f2;
}

.wkh-ps-parts-actions {
	display: flex;
	align-items: center;
	gap: 8px;
}

.wkh-ps-button {
	padding: 4px 10px;
	border: none;
	border-radius: 7px;
	background: #e36f94;
	font-size: 11.5px;
	font-weight: 700;
	color: #fff;
	cursor: pointer;
}

.wkh-ps-link {
	padding: 4px 2px;
	border: none;
	background: transparent;
	font-size: 11px;
	color: #aeb1c6;
	cursor: pointer;
}

.wkh-ps-link:hover {
	color: #fff;
}

/* choosing parts */
.wkh-ps-pick-outline {
	position: fixed;
	box-sizing: border-box;
	border: 2px solid #e36f94;
	border-radius: 4px;
	background: rgba(227, 111, 148, 0.12);
	pointer-events: none;
	transition: all 0.08s ease-out;
}

/* already chosen: dotted, no fill (the page stays readable) */
.wkh-ps-pick-outline.chosen {
	border: 2px dotted #e36f94;
	background: transparent;
	transition: none;
}

/* on a chosen part: clicking takes it out */
.wkh-ps-pick-outline.removes {
	border-color: #e5484d;
	background: rgba(229, 72, 77, 0.1);
}

.wkh-ps-pick-tag {
	position: absolute;
	top: -1px;
	right: -1px;
	padding: 2px 7px;
	border-radius: 0 3px 0 6px;
	background: #e5484d;
	font-size: 11px;
	font-weight: 700;
	color: #fff;
}

.wkh-ps-pick-bar {
	position: fixed;
	top: 12px;
	left: 50%;
	transform: translateX(-50%);
	width: min(520px, calc(100vw - 24px));
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	box-sizing: border-box;
	border: 1px solid rgba(255, 255, 255, 0.06);
	border-radius: 12px;
	background-color: #2a2d48;
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
	font-size: 12px;
	line-height: 1.4;
	color: #c9cbdb;
}

.wkh-ps-pick-bar b {
	color: #fff;
}

.wkh-ps-foot {
	display: flex;
	justify-content: flex-end;
	margin-top: 6px;
}

.wkh-ps-foot button {
	padding: 4px 8px;
	border: none;
	border-radius: 6px;
	background: transparent;
	font-size: 11px;
	color: #aeb1c6;
	cursor: pointer;
}

.wkh-ps-foot button:hover {
	background: rgba(255, 255, 255, 0.08);
	color: #fff;
}
</style>
