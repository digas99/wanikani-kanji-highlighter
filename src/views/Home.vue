<template>
	<div class="container home" :class="{ 'has-highlight-notice': showHighlightedNotice }">
		<div ref="stack" class="home-stack" :class="{ editing: editingLayout }">
			<!-- editing: drag the cards by their handle, eye to hide (saved as you go) -->
			<div v-if="editingLayout" class="home-edit-bar">
				<div class="home-edit-bar-text">
					<b>Customize home</b>
					<span>Drag a card by its handle; the eye hides it.</span>
				</div>
				<button type="button" class="home-edit-reset" @click="resetHomeLayout">Reset</button>
				<button type="button" class="home-edit-done" @click="editingLayout = false">Done</button>
			</div>

			<div
				v-for="section in editingLayout ? homeLayout : shownSections"
				:key="section.id"
				class="home-block"
				:class="{ 'is-off': !section.visible }"
				:data-id="section.id"
			>
				<div v-if="editingLayout" class="home-block-bar">
					<button type="button" class="home-block-handle" :title="`Drag to move ${section.label}`" :aria-label="`Move ${section.label}`">
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
							<circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
							<circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
						</svg>
					</button>
					<span class="home-block-label">{{ section.label }}</span>
					<span v-if="!section.visible" class="home-block-tag">Hidden</span>
					<button
						type="button"
						class="home-block-eye"
						:title="section.visible ? `Hide ${section.label}` : `Show ${section.label}`"
						:aria-pressed="section.visible"
						@click="toggleHomeSection(section.id)"
					>
						<svg v-if="section.visible" viewBox="0 0 24 24" aria-hidden="true">
							<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
						</svg>
						<svg v-else viewBox="0 0 24 24" aria-hidden="true">
							<path d="M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.8 17.8 0 0 1-3.2 4.2M6.6 6.6A17.6 17.6 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
						</svg>
					</button>
				</div>

				<!-- while editing: a short, non-interactive preview of the card -->
				<div v-if="section.visible" class="home-block-content" :inert="editingLayout || null">
			<!-- 1. Level + what to do now -->
			<ReviewsInfo
				v-if="section.id === 'hero'"
				:next="wk.summary.nextReviews"
				:lessons="wk.summary.lessons"
				:reviews="wk.summary.reviews"
				:level="wk.userInfo?.level ?? null"
				:username="wk.userInfo?.username ?? ''"
				:level-progress="wk.levelProgressionInfo?.progress ?? null"
			>
				<!-- Today: reviews, accuracy, lessons… since midnight -->
				<TodayActivity
					:summary="activity?.today ?? null"
					:syncing="activitySyncing"
					@show-moves="todayMovesShown = $event"
					@reveal-moves="revealProgressTiles"
				/>
			</ReviewsInfo>

			<!-- 2. Progress overview (one tile per SRS stage) -->
			<section v-else-if="section.id === 'progress'" ref="progressCard" class="home-card">
				<header class="home-card-head">
					<span class="home-card-title">Progress overview</span>
					<span v-if="isUpdating" class="home-card-meta home-updating" :title="updatingTitle">
						<span class="home-spinner" aria-hidden="true"></span>Updating…
					</span>
					<span v-else class="home-card-meta">{{ startedCount }} started</span>
				</header>
				<div class="home-card-body home-progress-body">
					<!-- badges: shown for a while after opening, and again while hovering the tiles -->
					<!-- …or today's SRS moves, while Today's "SRS stages" is hovered (or clicked) -->
					<div @mouseenter="tilesHovered = true" @mouseleave="tilesHovered = false">
						<ProgressionTiles
							:values="srsStageValues"
							:colors="srsStageColors"
							:deltas="todayMovesShown ? null : tileDeltas"
							:moves="todayMovesShown ? todayMoves : null"
							type="srs"
						/>
					</div>
					<ProgressionBar
						class="home-srs-bar"
						:values="progressBarValues"
						:colors="progressBarColors"
						type="srs"
						:sorting="progressBarSorting"
					/>
				</div>
			</section>

			<!-- 3. Levels in progress -->
			<section v-else-if="section.id === 'levels' && wk.levelsInProgress.length" class="home-card">
				<header class="home-card-head">
					<span class="home-card-title">Levels in progress</span>
					<div class="home-card-actions">
						<button
							v-if="levelsCollapsible"
							type="button"
							class="home-card-toggle"
							:aria-expanded="!levelsCollapsed"
							:title="levelsCollapsed ? 'Show all levels in progress' : 'Show only the current level'"
							@click="setLevelsCollapsed(!levelsCollapsed)"
						>
							{{ levelsCollapsed ? 'Show all' : 'Current only' }}
							<span class="home-card-toggle-arrow" :class="{ collapsed: levelsCollapsed }" aria-hidden="true"></span>
						</button>
						<!-- every row's subjects on one page, a section per row -->
						<RouterLink :to="{ name: 'SubjectGroups', query: { list: 'levels' } }" class="home-card-toggle" title="All their subjects, by level and type">
							Subjects ›
						</RouterLink>
					</div>
				</header>
				<div class="home-card-body">
					<LevelsInProgress
						:levels="wk.levelsInProgress"
						:collapsed="levelsCollapsed"
						@collapsible="levelsCollapsible = $event"
						@expand="setLevelsCollapsed(false)"
					/>
				</div>
			</section>

			<!-- Activity: burned / started / passed subjects per day -->
			<section v-else-if="section.id === 'activity' && wk.assignments.length" class="home-card">
				<header class="home-card-head">
					<span class="home-card-title">Activity</span>
					<!-- the calendar's ⓘ (what it shows), right after the title -->
					<span id="home-activity-info" class="home-activity-info"></span>
					<!-- the calendar's Burned / Started / Passed / All switch -->
					<span id="home-activity-views"></span>
				</header>
				<div class="home-card-body">
					<ActivityHeatmap :assignments="wk.assignments" views-target="#home-activity-views" info-target="#home-activity-info" />
				</div>
			</section>

			<!-- 4. JLPT / Jōyō (one card, switchable) -->
			<section v-else-if="section.id === 'school' && schoolTabs.length" class="home-card">
				<header class="home-card-head">
					<span class="home-card-title">School kanji</span>
					<div v-if="schoolTabs.length > 1" class="home-segmented" role="tablist">
						<button
							v-for="tab in schoolTabs"
							:key="tab.key"
							type="button"
							role="tab"
							:aria-selected="activeSchool === tab.key"
							:class="{ active: activeSchool === tab.key }"
							@click="setSchool(tab.key)"
						>
							{{ tab.label }}
						</button>
					</div>
					<span v-else class="home-card-meta">{{ schoolTabs[0].label }}</span>
				</header>
				<div class="home-card-body">
					<SchoolKanjiProgress :key="activeSchool" :school="activeSchool" :subjects="wk.allSubjects" :complete="wk.allSubjectsInMemory" />
					<!-- the legend, and the full page (kanji and words, by level) on its right -->
					<div class="home-school-foot">
						<SchoolProgressLegend class="home-school-legend" />
						<RouterLink :to="{ name: 'School', query: { school: activeSchool } }" class="home-school-more" title="JLPT and Jōyō progress for kanji and words">
							Kanji &amp; words ›
						</RouterLink>
					</div>
				</div>
			</section>

			<!-- 5. Highlighted on the current page -->
			<KanjiInPageList
				v-else-if="section.id === 'highlighted'"
				class="home-card highlighted-card"
				@highlight-summary="highlightSummary = $event"
			/>
			<p v-else class="home-block-empty">Nothing to show here right now.</p>
				</div>
			</div>

			<button v-if="!editingLayout" type="button" class="home-edit-button" @click="editingLayout = true">
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>
				Customize home
			</button>
		</div>

		<!-- once a day, on the first visit: how yesterday went (a toast at the top, see App.vue) -->
		<Teleport to="#top-toasts" defer>
			<Transition name="home-toast">
				<YesterdayRecap
					v-if="showRecap && isActive"
					:summary="activity.yesterday"
					:reviews-available="wk.summary.reviews?.length ?? 0"
					@dismiss="dismissRecap"
				/>
			</Transition>
		</Teleport>

		<!-- floating at the bottom: the highlighted-subjects notice -->
		<div class="home-toasts">
			<HighlightedKanjiNotice
				v-if="showHighlightedNotice"
				:count="highlightSummary.count"
				:mode-label="highlightSummary.modeLabel"
				:show-progress-bar="highlightSummary.showProgressBar"
				:bar-loading="highlightSummary.barLoading"
				:bar-values="highlightSummary.barValues"
				:bar-colors="highlightSummary.barColors"
				:bar-sorting="highlightSummary.barSorting"
				@click="scrollToHighlightedList"
			/>
		</div>
	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import { useSettingsStore } from '@/stores/settings';
import { DASHBOARD_REFRESH_MS } from '@/lib/apiClient';

import ReviewsInfo from '@/components/Home/ReviewsInfo.vue';
import ProgressionTiles from '@/components/Home/ProgressionTiles.vue';
import ProgressionBar from '@/components/Home/ProgressionBar.vue';
import LevelsInProgress from '@/components/Home/LevelsInProgress.vue';
import ActivityHeatmap from '@/components/Home/ActivityHeatmap.vue';
import TodayActivity from '@/components/Home/TodayActivity.vue';
import YesterdayRecap from '@/components/Home/YesterdayRecap.vue';
import Sortable from 'sortablejs';
import { resolveHomeLayout, DEFAULT_HOME_ORDER } from '@/utils/scripts/homeLayout';
import KanjiInPageList from '@/components/Home/KanjiInPageList.vue';
import HighlightedKanjiNotice from '@/components/Home/HighlightedKanjiNotice.vue';
import SchoolKanjiProgress from '@/components/Home/SchoolKanjiProgress.vue';
import SchoolProgressLegend from '@/components/Home/SchoolProgressLegend.vue';

import { srsStages } from '@/utils/scripts/wanikani';
import { groupAssignmentsBySRSStage } from '@/utils/scripts/common';
import { hasSchoolProgressSnapshot, LOCKED_SEGMENT_COLOR } from '@/utils/scripts/schoolKanji';
import { computeSinceLastVisit, getSinceLastVisit } from '@/utils/scripts/progressSnapshot';
import { getWKManager } from '@/lib/apiClient';
import { isInitialSyncLocked } from '@/utils/scripts/initialDataSync';
import {
	activityView,
	markRecapShown,
	readActivityView,
	syncDailyActivity,
	watchDailyActivity,
} from '@/utils/scripts/dailyActivity';

const SCHOOL_TAB_KEY = 'homeSchoolTab';
/** How long the "+12" badges stay on the progress tiles. */
const TILE_DELTAS_VISIBLE_MS = 10000;

const LEVELS_COLLAPSED_KEY = 'homeLevelsCollapsed';
/** The Yesterday recap counts as seen after this long on screen (or when dismissed). */
const RECAP_SEEN_MS = 3000;
/** …and hides itself after this long (as the friends' level-up toast does) */
const RECAP_VISIBLE_MS = 8000;

function readSavedSchool() {
	try {
		return localStorage.getItem(SCHOOL_TAB_KEY);
	} catch {
		return null;
	}
}

function readLevelsCollapsed() {
	try {
		return localStorage.getItem(LEVELS_COLLAPSED_KEY) === '1';
	} catch {
		return false;
	}
}

/** Home's bar: the locked subjects' count from the last visit (counting them takes a moment) */
const LOCKED_COUNT_KEY = 'homeLockedCount';
function savedLockedCount() {
	try {
		const count = Number(localStorage.getItem(LOCKED_COUNT_KEY));
		return Number.isFinite(count) && count > 0 ? count : 0;
	} catch {
		return 0;
	}
}

export default {
	name: 'Home',

	components: {
		ReviewsInfo,
		ProgressionTiles,
		ProgressionBar,
		LevelsInProgress,
		ActivityHeatmap,
		TodayActivity,
		YesterdayRecap,
		KanjiInPageList,
		HighlightedKanjiNotice,
		SchoolKanjiProgress,
		SchoolProgressLegend,
	},

	data() {
		return {
			srsStageValues: groupAssignmentsBySRSStage([]),
			dashboardRefreshTimer: null,
			highlightSummary: {
				count: 0,
				showProgressBar: false,
				barValues: [],
				barColors: {},
				barSorting: {},
				modeLabel: '',
			},
			highlightedListInView: false,
			highlightListObserver: null,
			savedSchool: readSavedSchool(),
			levelsCollapsed: readLevelsCollapsed(),
			levelsCollapsible: false,
			hasSchoolSnapshot: hasSchoolProgressSnapshot(),
			// the last count, until it's counted again (the bar is whole from the start)
			lockedCount: savedLockedCount(),
			/** Home is the page shown (it's kept alive while on other pages) */
			isActive: false,
			// computed once per popup session, after the data is fresh
			sinceLastVisit: getSinceLastVisit() ?? null,
			// tile badges are a brief "look what changed" after opening
			showTileDeltas: false,
			tilesHovered: false,
			/** Today's "SRS stages" tile is hovered or pinned: its moves on the tiles */
			todayMovesShown: false,
			tileDeltasTimer: null,
			/** "Customize home": the sections become rows to reorder / hide */
			editingLayout: false,
			/** Today / Yesterday (utils/scripts/dailyActivity) */
			activity: null,
			activitySyncing: false,
			recapVisible: false,
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		settingsStore() {
			return useSettingsStore();
		},
		srsStageColors() {
			return Object.fromEntries(Object.entries(srsStages).map(([key, value]) => [key, value.color]));
		},
		/** Something is still loading: the latest assignments, or subject levels. */
		isUpdating() {
			return this.wk.dashboardRefreshing || this.wk.syncInProgress;
		},
		updatingTitle() {
			return this.wk.syncInProgress
				? 'Syncing WaniKani subjects in the background'
				: 'Fetching your latest progress from WaniKani';
		},
		/** Fresh data for this visit: the refresh finished and nothing else is loading. */
		progressReady() {
			return this.wk.dashboardRefreshedAt > 0
				&& !this.isUpdating
				&& !this.wk.showLoadingScreen
				&& this.wk.assignments.length > 0;
		},
		/** The bar also shows locked subjects (the tiles don't). */
		progressBarValues() {
			if (!this.lockedCount) return this.srsStageValues;
			return [...this.srsStageValues, { id: -1, items: { length: this.lockedCount } }];
		},
		progressBarColors() {
			return { ...this.srsStageColors, '-1': LOCKED_SEGMENT_COLOR };
		},
		progressBarSorting() {
			// Initiate → Burned, then Locked at the end
			return { ...Object.fromEntries([...Array(10).keys()].map(stage => [stage, stage])), '-1': 10 };
		},
		/** Today's reviews, per SRS stage: how many subjects moved in and out of it */
		todayMoves() {
			const moves = {};
			for (const [before, after] of Object.values(this.activity?.today?.stages ?? {})) {
				if (before == null || after == null || before === after) continue;
				(moves[before] ??= { in: 0, out: 0 }).out += 1;
				(moves[after] ??= { in: 0, out: 0 }).in += 1;
			}
			return moves;
		},
		/** "+12" badges: shown for a while after opening, and while hovering the tiles */
		tileDeltas() {
			return this.showTileDeltas || this.tilesHovered ? this.sinceLastVisit?.deltas ?? null : null;
		},
		startedCount() {
			return this.srsStageValues
				.filter(stage => Number(stage.id) > 0)
				.reduce((sum, stage) => sum + stage.items.length, 0);
		},
		/** Sections in the saved order, with their visibility (Settings → Popup, or "Customize home"). */
		homeLayout() {
			return resolveHomeLayout(this.settingsStore.settings.home);
		},
		visibleSections() {
			return this.homeLayout.filter(section => section.visible);
		},
		/** Visible sections that have something to show (no empty gaps on Home). */
		shownSections() {
			const hasContent = {
				levels: this.wk.levelsInProgress.length > 0,
				activity: this.wk.assignments.length > 0,
				school: this.schoolTabs.length > 0,
			};
			return this.visibleSections.filter(section => hasContent[section.id] ?? true);
		},
		canShowHighlightedNotice() {
			return this.highlightSummary.count > 0
				&& !this.editingLayout
				&& this.visibleSections.some(section => section.id === 'highlighted')
				&& this.settingsStore.settings.extension_popup_interface.highlighted_kanji !== false;
		},
		showHighlightedNotice() {
			return this.canShowHighlightedNotice && !this.highlightedListInView;
		},
		showRecap() {
			return Boolean(this.recapVisible && !this.editingLayout && this.activity?.yesterday);
		},
		schoolTabs() {
			// a saved snapshot lets the card show before all subjects are in memory
			if (!this.wk.allSubjects.length && !this.hasSchoolSnapshot) return [];
			const ui = this.settingsStore.settings.extension_popup_interface;
			const tabs = [];
			if (ui.jlpt_kanji_progress !== false) tabs.push({ key: 'jlpt', label: 'JLPT' });
			if (ui.joyo_kanji_progress !== false) tabs.push({ key: 'joyo', label: 'Jōyō' });
			return tabs;
		},
		activeSchool() {
			const keys = this.schoolTabs.map(tab => tab.key);
			return keys.includes(this.savedSchool) ? this.savedSchool : keys[0];
		},
	},

	mounted() {
		this.wk.loadDashboardFromCache().then(() => {
			this.applyAssignments(this.wk.assignments);
		});
		readActivityView().then(view => this.setActivity(view));
		// the background sync (hourly) updates it too
		this.unwatchActivity = watchDailyActivity(view => this.setActivity(view));
	},

	/**
	 * Each visit (Home is kept alive between them, App.vue): this visit's refresh, typing to
	 * search, the timers and observers. Undone when leaving (deactivated), so they don't run on
	 * other pages.
	 */
	activated() {
		this.isActive = true;
		document.addEventListener('keydown', this.onTypeToSearch);
		// make sure this visit fetches fresh progress (no-op if done moments ago)
		void this.wk.refreshDashboard(false);
		clearInterval(this.dashboardRefreshTimer);
		this.dashboardRefreshTimer = setInterval(
			() => {
				this.wk.refreshDashboard();
				void this.syncActivity();
			},
			DASHBOARD_REFRESH_MS,
		);
		this.$nextTick(() => this.setupHighlightListObserver());
		void this.syncActivity();
	},

	deactivated() {
		this.isActive = false;
		document.removeEventListener('keydown', this.onTypeToSearch);
		clearInterval(this.dashboardRefreshTimer);
		this.dashboardRefreshTimer = null;
		this.teardownHighlightListObserver();
		// rearranging Home's sections ends with leaving it
		if (this.editingLayout) this.editingLayout = false;
		this.stopSortable();
	},

	beforeUnmount() {
		document.removeEventListener('keydown', this.onTypeToSearch);
		if (this.dashboardRefreshTimer) clearInterval(this.dashboardRefreshTimer);
		this.unwatchActivity?.();
		clearTimeout(this.recapSeenTimer);
		clearTimeout(this.recapHideTimer);
		clearTimeout(this.tileDeltasTimer);
		this.teardownHighlightListObserver();
		this.stopSortable();
	},

	methods: {
		/** Typing a letter (or kana / kanji, or a level number) on Home starts a search with it. */
		onTypeToSearch(event) {
			if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
			if (event.key.length !== 1 || !/[\p{L}\p{N}]/u.test(event.key)) return;
			const target = event.target;
			if (target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable)) return;
			event.preventDefault();
			void this.$router.push({ name: 'Search', query: { q: event.key } });
		},
		applyAssignments(assignments) {
			this.srsStageValues = groupAssignmentsBySRSStage(assignments);
			void this.refreshLockedCount();
		},
		async syncActivity() {
			const manager = getWKManager();
			// the first subject sync uses most of the API rate limit: the next round catches up
			if (!manager || await isInitialSyncLocked()) return;
			this.activitySyncing = true;
			try {
				this.setActivity(activityView(await syncDailyActivity(manager)));
			} finally {
				this.activitySyncing = false;
			}
		},
		setActivity(view) {
			this.activity = view;
			// the recap shows once a day: on the first visit after the day is over. It counts
			// as seen after a few seconds (Home can mount twice while the popup loads).
			if (view.showRecap && !this.recapVisible) {
				this.recapVisible = true;
				this.recapSeenTimer = setTimeout(() => void markRecapShown(), RECAP_SEEN_MS);
				// a toast, like the friends' level-ups: it goes away by itself
				this.recapHideTimer = setTimeout(() => this.dismissRecap(), RECAP_VISIBLE_MS);
			}
		},
		dismissRecap() {
			this.recapVisible = false;
			clearTimeout(this.recapSeenTimer);
			clearTimeout(this.recapHideTimer);
			void markRecapShown();
		},
		async refreshLockedCount() {
			const count = await this.wk.countLockedSubjects();
			// 0 while the subjects aren't counted yet: keep the last one
			if (!count && this.lockedCount) return;
			this.lockedCount = count;
			try {
				localStorage.setItem(LOCKED_COUNT_KEY, String(count));
			} catch {
				// only a head start
			}
		},
		async saveHomeLayout(sections) {
			await this.settingsStore.setSetting('home', 'order', sections.map(section => section.id));
			await this.settingsStore.setSetting('home', 'hidden', sections.filter(section => !section.visible).map(section => section.id));
		},
		resetHomeLayout() {
			void this.saveHomeLayout(DEFAULT_HOME_ORDER.map(id => ({ id, visible: true })));
		},
		toggleHomeSection(id) {
			void this.saveHomeLayout(this.homeLayout.map(section =>
				(section.id === id ? { ...section, visible: !section.visible } : section)));
		},
		/** Drag the cards themselves (by their handle) while customizing. */
		startSortable() {
			this.stopSortable();
			const stack = this.$refs.stack;
			if (!stack) return;
			this.sortable = Sortable.create(stack, {
				draggable: '.home-block',
				handle: '.home-block-handle',
				animation: 180,
				ghostClass: 'home-block-ghost',
				chosenClass: 'home-block-chosen',
				// tall cards in a short popup: scroll while dragging near the edges
				scroll: true,
				scrollSensitivity: 70,
				bubbleScroll: true,
				onEnd: ({ item, from, oldIndex, newIndex, oldDraggableIndex, newDraggableIndex }) => {
					if (oldIndex == null || oldIndex === newIndex) return;
					// Vue owns the cards: undo Sortable's DOM move, then reorder through the data
					from.removeChild(item);
					from.insertBefore(item, from.children[oldIndex] ?? null);
					const next = [...this.homeLayout];
					const [moved] = next.splice(oldDraggableIndex, 1);
					next.splice(newDraggableIndex, 0, moved);
					void this.saveHomeLayout(next);
				},
			});
		},
		stopSortable() {
			this.sortable?.destroy();
			this.sortable = null;
		},
		setSchool(key) {
			this.savedSchool = key;
			try {
				localStorage.setItem(SCHOOL_TAB_KEY, key);
			} catch {
				/* remembering the tab is optional */
			}
		},
		setLevelsCollapsed(collapsed) {
			this.levelsCollapsed = collapsed;
			try {
				localStorage.setItem(LEVELS_COLLAPSED_KEY, collapsed ? '1' : '0');
			} catch {
				/* remembering the choice is optional */
			}
		},
		/** Today's moves were pinned: the tiles may be below the fold */
		revealProgressTiles() {
			const card = Array.isArray(this.$refs.progressCard) ? this.$refs.progressCard[0] : this.$refs.progressCard;
			if (!card) return;
			const box = card.getBoundingClientRect();
			if (box.top >= 0 && box.top + 180 <= window.innerHeight) return;
			card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		},
		scrollToHighlightedList() {
			document.getElementById('highlighted-kanji-list')?.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			});
		},
		setupHighlightListObserver() {
			this.teardownHighlightListObserver();
			if (!this.canShowHighlightedNotice) return;

			const target = document.getElementById('highlighted-kanji-list');
			if (!target) return;

			this.highlightListObserver = new IntersectionObserver(
				([entry]) => {
					this.highlightedListInView = entry.isIntersecting;
				},
				{ threshold: 0.12 },
			);
			this.highlightListObserver.observe(target);
		},
		teardownHighlightListObserver() {
			this.highlightListObserver?.disconnect();
			this.highlightListObserver = null;
		},
	},

	watch: {
		// the first sync finished (here, or in the background while this was open): Today waited for it
		'wk.initialSyncComplete'(complete) {
			if (complete) void this.syncActivity();
		},
		progressReady: {
			handler(ready) {
				if (!ready || this.sinceLastVisit) return;
				this.sinceLastVisit = computeSinceLastVisit(this.wk.assignments);
				if (this.sinceLastVisit && Object.keys(this.sinceLastVisit.deltas).length) {
					this.showTileDeltas = true;
					this.tileDeltasTimer = setTimeout(() => { this.showTileDeltas = false; }, TILE_DELTAS_VISIBLE_MS);
				}
			},
			immediate: true,
		},
		'wk.assignments': {
			handler(assignments) {
				this.applyAssignments(assignments);
			},
			deep: true,
		},
		highlightSummary: {
			handler() {
				this.$nextTick(() => this.setupHighlightListObserver());
			},
			deep: true,
		},
		editingLayout(editing) {
			if (editing) {
				// start from the top of the (now shorter) page
				window.scrollTo({ top: 0 });
				this.$nextTick(() => this.startSortable());
				return;
			}
			this.stopSortable();
			// the highlighted list is interactive again: watch it for the floating notice
			this.$nextTick(() => this.setupHighlightListObserver());
		},
		canShowHighlightedNotice(enabled) {
			if (!enabled) {
				this.highlightedListInView = false;
				this.teardownHighlightListObserver();
				return;
			}
			this.$nextTick(() => this.setupHighlightListObserver());
		},
	},
};
</script>

<style scoped>
.container {
	display: flex;
	flex-direction: column;
}

.home {
	padding-bottom: 24px;
	margin-top: 0px;
}

.home.has-highlight-notice {
	padding-bottom: 120px;
}

/* floating at the bottom: the highlighted-subjects notice */
.home-toasts {
	position: fixed;
	left: calc(10px + var(--frame-left, 0px));
	bottom: 10px;
	width: calc(var(--content-width, 425px) - 15px);
	z-index: 99;
	display: flex;
	flex-direction: column;
	gap: 8px;
	pointer-events: none;
}

.home-toasts > * {
	pointer-events: auto;
}

/* the notice positions itself when alone: inside the stack it just flows */
.home-toasts :deep(.highlight-notice) {
	position: static;
	width: auto;
}

.home-toast-enter-active,
.home-toast-leave-active {
	transition: opacity 0.25s ease, transform 0.25s ease;
}

/* the recap toast (at the top): slides down in, up out */
.home-toast-enter-from,
.home-toast-leave-to {
	opacity: 0;
	transform: translateY(-10px);
}

.home-stack {
	display: flex;
	flex-direction: column;
	gap: 12px;
	/* the hero card floats below the top edge like the other cards */
	padding-top: 12px;
}

.home-card {
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	border-radius: var(--card-radius, 12px);
	overflow: hidden;
	box-shadow: 0 2px 10px var(--shadow-soft-color);
}

.home-card-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 12px 12px 0;
}

/* beside the title; the rest of the row's controls stay on the right */
.home-activity-info {
	display: inline-flex;
	margin-right: auto;
	margin-left: -2px;
	color: var(--font-sec-color);
}

.home-card-title {
	/* pink pill label, as in the subject details popup */
	display: block;
	width: fit-content;
	padding: 3px 10px;
	border-radius: 999px;
	background: var(--pill-color, #e36f94);
	color: #fff;
	font-weight: 700;
	font-size: 11.5px;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	line-height: 1.4;
}

.home-card-meta {
	font-size: 11.5px;
	color: var(--font-sec-color);
}

.home-card-body {
	padding: 10px 12px 12px;
}

.home-srs-bar {
	margin-top: 10px;
}

/* discreet "something is loading" in the card header */
.home-updating {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}

.home-spinner {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	border: 2px solid var(--surface-border-color);
	border-top-color: var(--wanikani-sec);
	animation: home-spin 0.8s linear infinite;
}

@keyframes home-spin {
	to {
		transform: rotate(360deg);
	}
}


/* the tiles bring their own padding */
.home-progress-body :deep(#progression-stats) {
	padding: 0;
}

/* "Show all / Current only" switch for Levels in progress */
.home-card-toggle {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	border: 1px solid var(--surface-border-color);
	background: var(--surface-muted-color);
	color: var(--font-sec-color);
	font-family: inherit;
	font-size: 11px;
	font-weight: 700;
	padding: 3px 9px;
	border-radius: 999px;
	cursor: pointer;
	transition: color 0.2s, background-color 0.2s;
}

.home-card-actions {
	display: flex;
	align-items: center;
	gap: 6px;
}

a.home-card-toggle {
	text-decoration: none;
}

.home-card-toggle:hover {
	color: var(--heading-color, #2a2d48);
}

.home-card-toggle-arrow {
	width: 5px;
	height: 5px;
	border-right: 2px solid currentColor;
	border-bottom: 2px solid currentColor;
	/* points up when expanded (click to collapse), down when collapsed */
	transform: translateY(1px) rotate(-135deg);
	transition: transform 0.25s ease;
}

.home-card-toggle-arrow.collapsed {
	transform: translateY(-2px) rotate(45deg);
}

.home-school-foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin-top: 8px;
}

.home-school-foot .home-school-legend {
	flex: 1;
}

.home-school-more {
	flex-shrink: 0;
	font-size: 11.5px;
	font-weight: 700;
	color: var(--pill-color, #e36f94);
	white-space: nowrap;
}

.home-school-more:hover {
	opacity: 1;
	text-decoration: underline;
}

/* JLPT / Jōyō switch: same segmented control as the details popup tabs */
.home-segmented {
	display: flex;
	gap: 2px;
	padding: 2px;
	border-radius: 8px;
	background: var(--surface-muted-color);
	border: 1px solid var(--surface-border-color);
}

.home-segmented button {
	border: none;
	background: transparent;
	color: var(--tab-inactive-color);
	font-family: inherit;
	font-size: 11px;
	font-weight: 700;
	padding: 4px 10px;
	border-radius: 6px;
	cursor: pointer;
	transition: background-color 0.2s, color 0.2s;
}

.home-segmented button.active {
	background: var(--pill-color, #e36f94);
	color: #fff;
}

.home-segmented button:hover:not(.active) {
	color: var(--heading-color, #2a2d48);
}

.highlighted-card {
	padding: 0;
}

/* "Customize home": a quiet button under the sections */
.home-edit-button {
	display: flex;
	align-items: center;
	gap: 6px;
	align-self: center;
	padding: 5px 12px;
	border: 1px solid var(--surface-border-color);
	border-radius: 999px;
	background: transparent;
	color: var(--font-sec-color);
	font-family: inherit;
	font-size: 11.5px;
	font-weight: 700;
	cursor: pointer;
	transition: background-color 0.15s, color 0.15s;
}

.home-edit-button:hover {
	background: var(--surface-muted-color);
	color: var(--heading-color, #2a2d48);
}

.home-edit-button svg {
	width: 13px;
	height: 13px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.home-edit-done {
	padding: 4px 14px;
	border: none;
	border-radius: 999px;
	background: var(--pill-color, #e36f94);
	color: #fff;
	font-family: inherit;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
}

.home-edit-reset {
	padding: 4px 10px;
	border: 1px solid var(--surface-border-color);
	border-radius: 999px;
	background: transparent;
	color: var(--font-sec-color);
	font-family: inherit;
	font-size: 11.5px;
	font-weight: 700;
	cursor: pointer;
}

/* ---------- customizing: drag the cards themselves ---------- */

.home-edit-bar {
	/* pinned while dragging along a long page (sticky doesn't work here: the page
	   has overflow-x: hidden) */
	position: fixed;
	top: 8px;
	left: calc(var(--content-padding-x, 10px) + var(--frame-left, 0px));
	width: calc(var(--content-width, 100%) - 2 * var(--content-padding-x, 10px));
	box-sizing: border-box;
	z-index: 20;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 12px;
	border-radius: var(--card-radius, 12px);
	border: 1px solid var(--surface-border-color);
	background: var(--fill-color);
	box-shadow: 0 4px 14px var(--shadow-soft-color);
}

.home-edit-bar-text {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 1px;
	font-size: 11.5px;
	color: var(--font-sec-color);
}

.home-edit-bar-text b {
	font-size: 13px;
	color: var(--heading-color, #2a2d48);
}

/* room for the pinned bar above the first card */
.home-stack.editing {
	padding-top: 78px;
}

.home-stack.editing .home-block {
	border-radius: var(--card-radius, 12px);
	outline: 2px dashed var(--surface-border-color);
	outline-offset: 3px;
}

.home-block-bar {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 6px;
	padding: 4px 6px 4px 2px;
	border-radius: 10px;
	background: var(--surface-muted-color);
}

.home-block-handle,
.home-block-eye {
	display: flex;
	padding: 4px;
	border: none;
	border-radius: 6px;
	background: transparent;
	cursor: pointer;
	touch-action: none;
}

.home-block-handle {
	cursor: grab;
}

.home-block-handle:hover,
.home-block-eye:hover {
	background: var(--fill-color);
}

.home-block-handle svg {
	width: 18px;
	height: 18px;
	fill: var(--font-sec-color);
}

.home-block-eye svg {
	width: 18px;
	height: 18px;
	fill: none;
	stroke: var(--font-sec-color);
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.home-block-label {
	flex: 1;
	min-width: 0;
	font-size: 12.5px;
	font-weight: 700;
	color: var(--heading-color, #2a2d48);
}

.home-block-tag {
	padding: 1px 7px;
	border-radius: 999px;
	background: var(--fill-color);
	font-size: 10.5px;
	font-weight: 700;
	color: var(--font-sec-color);
}

/* the card, as a short preview that fades out (easy to drag in a small popup) */
.home-stack.editing .home-block-content {
	max-height: 150px;
	overflow: hidden;
	-webkit-mask-image: linear-gradient(to bottom, #000 55%, transparent);
	mask-image: linear-gradient(to bottom, #000 55%, transparent);
	pointer-events: none;
	user-select: none;
}

.home-stack.editing .home-block.is-off {
	opacity: 0.6;
}

.home-block-empty {
	margin: 0;
	padding: 14px;
	border-radius: var(--card-radius, 12px);
	border: 1px dashed var(--surface-border-color);
	font-size: 12px;
	text-align: center;
	color: var(--font-sec-color);
}

/* SortableJS: the card being dragged, and where it will land */
.home-block.home-block-chosen .home-block-bar {
	box-shadow: 0 0 0 2px var(--pill-color, #e36f94);
}

.home-block.home-block-ghost {
	opacity: 0.35;
}
</style>

<style>
.home .home-srs-bar#progression-bar,
.home .home-srs-bar {
	padding: 0;
}

.home .home-srs-bar > li:first-child,
.home .home-srs-bar > li:first-child > a {
	border-radius: 6px 0 0 6px;
}

.home .home-srs-bar > li:last-child,
.home .home-srs-bar > li:last-child > a {
	border-radius: 0 6px 6px 0;
}
</style>
