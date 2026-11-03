<template>
	<div class="container levels-page">
		<div v-if="!levelsStats" class="levels-empty">
			Loading level history…
		</div>
		<template v-else>
			<!-- every level: when it started, how long it took, how much of it is passed -->
			<section class="levels-card">
				<header class="levels-head">
					<span class="levels-title">Levels</span>
					<span class="levels-summary">
						<b>{{ burnedCount }}</b> of {{ MAX_LEVEL }} burned
					</span>
				</header>
				<div id="levelsList" class="levels-list">
					<RouterLink
						v-for="entry in levelRows"
						:key="entry.level"
						:to="{ name: 'Profile', query: { level: entry.level } }"
						class="level-row"
						:class="{ current: entry.current }"
						:title="`Check level ${entry.level}`"
					>
						<span class="level-badge">{{ entry.level }}</span>
						<span class="level-info">
							<span class="level-date">
								{{ entry.attempt.startDate }}
								<span v-if="entry.current" class="level-tag">Now</span>
								<span v-if="entry.burned" class="level-tag burned" :title="`All ${entry.progress.total} burned`">
									<svg viewBox="4 1 16 22" aria-hidden="true">
										<path d="M12 1.5c.6 3.2 2.6 5 4.2 7.1A7.6 7.6 0 0 1 18 13.5 6 6 0 0 1 12 22a6 6 0 0 1-6-6c0-2.3 1-4 2.3-5.3.1 1.6.9 2.7 2 3-.7-3.4.5-7.3 1.7-12.2z" />
									</svg>
									Burned
								</span>
							</span>
							<span class="level-days">{{ entry.attempt.days }} {{ entry.attempt.days === '1' ? 'day' : 'days' }}{{ entry.current ? ' so far' : '' }}</span>
							<span
								v-for="(attempt, index) in entry.pastAttempts"
								:key="index"
								class="level-past"
							>Before a reset: {{ attempt.startDate }} · {{ attempt.days }} days</span>
						</span>
						<span
							v-if="entry.progress.total"
							class="level-progress"
							:title="`${entry.progress.passed} / ${entry.progress.total} passed (${entry.progress.percentage.toFixed(1)}%)`"
						>
							<span class="level-progress-bar">
								<span :class="{ full: entry.passed }" :style="{ width: `${entry.progress.percentage}%` }"></span>
							</span>
							<span class="level-progress-value">{{ entry.progress.passed }} / {{ entry.progress.total }}</span>
						</span>
					</RouterLink>
				</div>
			</section>

			<LevelsProjections ref="projections" :class="{ flash: flashProjections }" />

			<LevelsDurationChart :levels-stats="levelsStats" />
		</template>
	</div>
</template>

<script>
import { RouterLink } from 'vue-router';
import { useWKStore } from '@/stores';
import LevelsDurationChart from '@/components/Levels/LevelsDurationChart.vue';
import LevelsProjections from '@/components/Levels/LevelsProjections.vue';
import {
	getLevelPassProgress,
	levelDurationDays,
} from '@/utils/scripts/levelStats';

const MAX_LEVEL = 60;

const attemptRow = entry => ({
	startDate: entry.unlocked_at.split('T')[0],
	days: levelDurationDays(entry).toFixed(0),
});

export default {
	name: 'Levels',

	components: {
		RouterLink,
		LevelsDurationChart,
		LevelsProjections,
	},

	data() {
		return {
			levelBySubjectId: new Map(),
			MAX_LEVEL,
			flashProjections: false,
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		levelsStats() {
			return this.wk.levelsStats;
		},
		levelRows() {
			if (!this.levelsStats) return [];

			const levels = Object.keys(this.levelsStats).map(Number).sort((a, b) => b - a);
			return levels.map(level => {
				// newest attempt first (normalizeLevelsStats); older ones were before a reset
				const [latest, ...past] = this.levelsStats[level] || [];
				const progress = getLevelPassProgress(
					level,
					this.wk.assignments,
					this.levelBySubjectId,
				);
				const burned = this.burnedByLevel.get(level) ?? 0;
				return {
					level,
					attempt: attemptRow(latest),
					pastAttempts: past.map(attemptRow),
					passed: Boolean(latest.passed_at),
					current: level === levels[0] && !latest.passed_at,
					progress,
					// a passed level has all its subjects unlocked, so its assignments are all of them
					burned: Boolean(latest.passed_at) && progress.total > 0 && burned === progress.total,
				};
			});
		},
		/** level → burned subjects (visible assignments, as getLevelPassProgress counts them) */
		burnedByLevel() {
			const counts = new Map();
			for (const assignment of this.wk.assignments ?? []) {
				if (assignment.hidden || !assignment.burned_at) continue;
				const level = this.levelBySubjectId.get(assignment.subject_id);
				if (level) counts.set(level, (counts.get(level) ?? 0) + 1);
			}
			return counts;
		},
		burnedCount() {
			return this.levelRows.filter(entry => entry.burned).length;
		},
	},

	watch: {
		// the card shows once the level history is in
		levelsStats() {
			this.focusProjections();
		},
	},

	async mounted() {
		this.focusProjections();
		await this.loadLevelMap();
		this.wk.refreshLevelProgressions();
	},

	methods: {
		/** From Home's calendar (a projected level up): straight to the projections, flashed. */
		focusProjections() {
			if (this.$route.query.focus !== 'projections' || this._focused) return;
			this.$nextTick(() => {
				if (!this.$refs.projections?.$el) return;
				this._focused = true;
				// after the router's own scroll to the top (it would cancel ours)
				setTimeout(() => {
					const card = this.$refs.projections?.$el;
					if (!card) return;
					// just below the fixed top bar
					const topbar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) || 45;
					window.scrollTo({ top: Math.max(0, card.getBoundingClientRect().top + window.scrollY - topbar - 10), behavior: 'smooth' });
					this.flashProjections = true;
					setTimeout(() => { this.flashProjections = false; }, 1400);
				}, 200);
			});
		},
		async loadLevelMap() {
			const wkManager = this.wk.manager;
			if (!wkManager) return;
			this.levelBySubjectId = await wkManager.storage.getSubjectIdLevelMap();
		},
	},
};
</script>

<style scoped>
.levels-page {
	display: flex;
	flex-direction: column;
	gap: 10px;
	min-height: 560px;
	padding-top: 10px;
	padding-bottom: 16px;
}

/* arriving from the calendar: a short glow around the projections */
.levels-page :deep(.projections) {
	transition: box-shadow 0.4s ease;
}

.levels-page :deep(.projections.flash) {
	box-shadow: 0 0 0 3px var(--pill-color, #e36f94), 0 2px 10px var(--shadow-soft-color);
}

.levels-empty {
	padding: 20px;
	text-align: center;
	color: var(--font-sec-color);
}

/* as Home's cards */
.levels-card {
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	border-radius: var(--card-radius, 12px);
	box-shadow: 0 2px 10px var(--shadow-soft-color);
	overflow: hidden;
}

.levels-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 12px 12px 0;
}

.levels-title {
	padding: 3px 10px;
	border-radius: 999px;
	background: var(--pill-color, #e36f94);
	color: #fff;
	font-size: 11.5px;
	font-weight: 700;
	letter-spacing: 0.04em;
	line-height: 1.4;
	text-transform: uppercase;
}

.levels-summary {
	font-size: 12px;
	color: var(--font-sec-color);
}

.levels-summary b {
	color: var(--font-color);
}

.levels-list {
	max-height: 300px;
	overflow: auto;
	margin-top: 8px;
	padding: 0 6px 6px;
}

/* a row per level: badge, dates, progress */
.level-row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 7px 6px;
	border-radius: 8px;
	color: inherit;
	text-decoration: none;
	transition: background-color 0.15s;
}

.level-row + .level-row {
	border-top: 1px solid var(--surface-border-color);
}

.level-row:hover {
	background: var(--surface-muted-color);
}

.level-badge {
	flex: 0 0 auto;
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 8px;
	background: color-mix(in srgb, var(--wanikani, #f100a1) 12%, transparent);
	color: var(--wanikani, #f100a1);
	font-size: 14px;
	font-weight: 800;
	font-variant-numeric: tabular-nums;
}

.level-row.current .level-badge {
	background: var(--wanikani, #f100a1);
	color: #fff;
}

.level-info {
	flex: 0 0 auto;
	width: 150px;
	display: flex;
	flex-direction: column;
	gap: 1px;
	min-width: 0;
}

.level-date {
	display: flex;
	align-items: center;
	gap: 5px;
	font-size: 12.5px;
	font-weight: 700;
	white-space: nowrap;
	color: var(--heading-color, #2a2d48);
	font-variant-numeric: tabular-nums;
}

.level-tag {
	padding: 0 6px;
	border-radius: 999px;
	background: var(--pill-color, #e36f94);
	color: #fff;
	font-size: 9.5px;
	font-weight: 800;
	line-height: 15px;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

/* every subject of the level burned */
.level-tag.burned {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	background: #e20000;
}

.level-tag.burned svg {
	width: 8px;
	height: 9px;
	fill: #fff;
}

.level-days {
	font-size: 11.5px;
	color: var(--font-sec-color);
}

.level-past {
	font-size: 10.5px;
	color: var(--font-sec-color);
	opacity: 0.75;
	white-space: nowrap;
}

/* as the JLPT level meters */
.level-progress {
	flex: 1 1 auto;
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.level-progress-bar {
	flex: 1;
	height: 7px;
	border-radius: 999px;
	background: var(--surface-muted-color);
	overflow: hidden;
}

.level-progress-bar span {
	display: block;
	height: 100%;
	border-radius: 999px;
	background: var(--wanikani-sec, #00aaff);
}

.level-progress-bar span.full {
	background: #30a46c;
}

.level-progress-value {
	flex-shrink: 0;
	min-width: 56px;
	font-size: 11px;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	text-align: right;
	color: var(--font-color);
}
</style>
