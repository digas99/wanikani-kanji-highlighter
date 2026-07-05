<template>
	<div class="container home" :class="{ 'has-highlight-notice': showHighlightedNotice }">
		<div class="home-stack">
			<section class="home-card reviews-card">
				<ReviewsInfo
					:next="wk.summary.nextReviews"
					:lessons="wk.summary.lessons"
					:reviews="wk.summary.reviews"
				/>
			</section>

			<section class="home-card">
				<div class="home-card-title">Progress overview</div>
				<div class="home-card-body">
					<ProgressionTiles
						:values="progressionTilesValues"
						:colors="progressionTilesColors"
						:type="progressionTilesType"
					/>
					<ProgressionBar
						:values="progressionBarValues"
						:colors="progressionBarColors"
						:type="progressionBarType"
						:sorting="progressionBarSorting"
					/>
				</div>
			</section>

			<section v-if="wk.levelsInProgress.length" class="home-card">
				<div class="home-card-title">Levels in progress</div>
				<div class="home-card-body">
					<LevelsInProgress :levels="wk.levelsInProgress" />
				</div>
			</section>

			<section v-if="showJlptProgress" class="home-card">
				<div class="home-card-title">JLPT Kanji Progress</div>
				<div class="home-card-body">
					<SchoolKanjiProgress school="jlpt" :subjects="wk.allSubjects" />
				</div>
			</section>

			<section v-if="showJoyoProgress" class="home-card">
				<div class="home-card-title">Jōyō Kanji Progress</div>
				<div class="home-card-body">
					<SchoolKanjiProgress school="joyo" :subjects="wk.allSubjects" />
				</div>
			</section>

			<section v-if="showSchoolLegend" class="home-card school-legend-card">
				<div class="home-card-body">
					<SchoolProgressLegend />
				</div>
			</section>

			<KanjiInPageList
				class="home-card highlighted-card"
				@highlight-summary="highlightSummary = $event"
			/>
		</div>

		<HighlightedKanjiNotice
			v-if="showHighlightedNotice"
			:count="highlightSummary.count"
			:mode-label="highlightSummary.modeLabel"
			:show-progress-bar="highlightSummary.showProgressBar"
			:bar-values="highlightSummary.barValues"
			:bar-colors="highlightSummary.barColors"
			:bar-sorting="highlightSummary.barSorting"
			@click="scrollToHighlightedList"
		/>
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
import KanjiInPageList from '@/components/Home/KanjiInPageList.vue';
import HighlightedKanjiNotice from '@/components/Home/HighlightedKanjiNotice.vue';
import SchoolKanjiProgress from '@/components/Home/SchoolKanjiProgress.vue';
import SchoolProgressLegend from '@/components/Home/SchoolProgressLegend.vue';

import { srsStages } from '@/utils/scripts/wanikani';
import { groupAssignmentsBySRSStage } from '@/utils/scripts/common';

export default {
	name: 'Home',

	components: {
		ReviewsInfo,
		ProgressionTiles,
		ProgressionBar,
		LevelsInProgress,
		KanjiInPageList,
		HighlightedKanjiNotice,
		SchoolKanjiProgress,
		SchoolProgressLegend,
	},

	data() {
		return {
			srsStageColors: {},
			progressionTilesValues: [
				{ id: 0, items: [] },
				{ id: 1, items: [] },
				{ id: 2, items: [] },
				{ id: 3, items: [] },
				{ id: 4, items: [] },
				{ id: 5, items: [] },
				{ id: 6, items: [] },
				{ id: 7, items: [] },
				{ id: 8, items: [] },
				{ id: 9, items: [] }
			],
			progressionTilesColors: {},
			progressionTilesType: null,
			progressionBarValues: [
				{ id: 0, items: [] },
				{ id: 1, items: [] },
				{ id: 2, items: [] },
				{ id: 3, items: [] },
				{ id: 4, items: [] },
				{ id: 5, items: [] },
				{ id: 6, items: [] },
				{ id: 7, items: [] },
				{ id: 8, items: [] },
				{ id: 9, items: [] }
			],
			progressionBarColors: {},
			progressionBarType: null,
			progressionBarSorting: {},
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
		};
	},

	computed: {
		srsStages() {
			return srsStages;
		},
		wk() {
			return useWKStore();
		},
		settingsStore() {
			return useSettingsStore();
		},
		canShowHighlightedNotice() {
			return this.highlightSummary.count > 0
				&& this.settingsStore.settings.extension_popup_interface.highlighted_kanji !== false;
		},
		showHighlightedNotice() {
			return this.canShowHighlightedNotice && !this.highlightedListInView;
		},
		showJlptProgress() {
			return this.settingsStore.settings.extension_popup_interface.jlpt_kanji_progress !== false
				&& this.wk.allSubjects.length > 0;
		},
		showJoyoProgress() {
			return this.settingsStore.settings.extension_popup_interface.joyo_kanji_progress !== false
				&& this.wk.allSubjects.length > 0;
		},
		showSchoolLegend() {
			return this.showJlptProgress || this.showJoyoProgress;
		},
	},

	mounted() {
		this.srsStageColors = Object.fromEntries(Object.entries(this.srsStages).map(([k, v]) => [k, v.color]));
		this.progressionTilesColors = this.srsStageColors;
		this.progressionBarColors = this.srsStageColors;
		this.wk.loadDashboardFromCache().then(() => {
			this.applyAssignments(this.wk.assignments);
		});
		this.dashboardRefreshTimer = setInterval(
			() => this.wk.refreshDashboard(),
			DASHBOARD_REFRESH_MS,
		);
		this.$nextTick(() => this.setupHighlightListObserver());
	},

	beforeUnmount() {
		if (this.dashboardRefreshTimer) clearInterval(this.dashboardRefreshTimer);
		this.teardownHighlightListObserver();
	},

	methods: {
		applyAssignments(assignments) {
			const assignmentsBySrsStage = groupAssignmentsBySRSStage(assignments);

			this.progressionTilesValues = assignmentsBySrsStage;
			this.progressionTilesColors = this.srsStageColors;
			this.progressionTilesType = 'srs';
			this.progressionBarValues = assignmentsBySrsStage;
			this.progressionBarColors = this.srsStageColors;
			this.progressionBarType = 'srs';
			this.progressionBarSorting = {};
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
		canShowHighlightedNotice(enabled) {
			if (!enabled) {
				this.highlightedListInView = false;
				this.teardownHighlightListObserver();
				return;
			}
			this.$nextTick(() => this.setupHighlightListObserver());
		},
	},
}
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

.home-stack {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.home-card {
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	border-radius: 12px;
	overflow: hidden;
	box-shadow: 0 2px 10px var(--shadow-soft-color);
}

.reviews-card {
	border: none;
	border-top-left-radius: 0;
    border-top-right-radius: 0;
}

.home-card-title {
	padding: 9px 14px;
	background: var(--default-color);
	color: white;
	font-weight: bold;
	font-size: 13px;
}

.home-card-body {
	padding: 10px 8px;
}

.highlighted-card {
	padding: 0;
}

.school-legend-card .home-card-body {
	padding-top: 6px;
	padding-bottom: 8px;
}

#progression-bar {
	padding: 7px 0 0;
}
</style>

<style>
.home #progression-bar>li:first-child,
.home #progression-bar>li:first-child>a {
	border-radius: 5px 0 0 5px;
}

.home #progression-bar>li:last-child,
.home #progression-bar>li:last-child>a {
	border-radius: 0 5px 5px 0;
}
</style>
