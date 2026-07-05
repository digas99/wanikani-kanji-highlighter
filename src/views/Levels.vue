<template>
	<div class="container levels-page">
		<div v-if="!levelsStats" class="levels-empty">
			Loading level history…
		</div>
		<template v-else>
			<div id="levelsList" class="levels-list section">
				<RouterLink
					v-for="entry in levelRows"
					:key="entry.level"
					:to="{ name: 'Profile', query: { level: entry.level } }"
					class="level clickable"
					:title="`Check level ${entry.level}`"
				>
					<div class="label">{{ entry.level }}</div>
					<div class="values">
						<div v-for="(attempt, index) in entry.attempts" :key="`${entry.level}-${index}`">
							<div>{{ attempt.startDate }}</div>
							<div>{{ attempt.days }} days</div>
						</div>
					</div>
					<div
						v-if="entry.progress.total"
						class="progress-bar"
						:title="`${entry.progress.passed} / ${entry.progress.total} ${entry.progress.percentage.toFixed(1)}%`"
					>
						<div class="outer">
							<div
								class="progress"
								:style="{ width: `${entry.progress.percentage}%` }"
							>
								<span v-if="entry.progress.percentage >= 40">
									{{ entry.progress.passed }} / {{ entry.progress.total }}
								</span>
							</div>
						</div>
					</div>
				</RouterLink>
			</div>

			<LevelsDurationChart :levels-stats="levelsStats" />
		</template>
	</div>
</template>

<script>
import { RouterLink } from 'vue-router';
import { useWKStore } from '@/stores';
import LevelsDurationChart from '@/components/Levels/LevelsDurationChart.vue';
import {
	getLevelPassProgress,
	levelDurationDays,
} from '@/utils/scripts/levelStats';

export default {
	name: 'Levels',

	components: {
		RouterLink,
		LevelsDurationChart,
	},

	data() {
		return {
			levelBySubjectId: new Map(),
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

			return Object.keys(this.levelsStats)
				.sort((a, b) => Number(b) - Number(a))
				.map(levelKey => {
					const level = Number(levelKey);
					const attempts = [...(this.levelsStats[levelKey] || [])]
						.reverse()
						.map(entry => ({
							startDate: entry.unlocked_at.split('T')[0],
							days: levelDurationDays(entry).toFixed(0),
						}));

					return {
						level,
						attempts,
						progress: getLevelPassProgress(
							level,
							this.wk.assignments,
							this.levelBySubjectId,
						),
					};
				});
		},
	},

	async mounted() {
		await this.loadLevelMap();
		this.wk.refreshLevelProgressions();
	},

	methods: {
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
	min-height: 560px;
}

.levels-empty {
	padding: 20px;
	text-align: center;
	color: var(--font-sec-color);
}

.section {
	background: var(--fill-color);
}

.levels-list {
	height: 310px;
	overflow: auto;
}

.level {
	padding: 5px;
	border-bottom: 1px solid var(--surface-border-color);
	display: flex;
	align-items: center;
	color: inherit;
	text-decoration: none;
}

.level > div {
	width: 100%;
}

.level .label {
	font-size: 22px;
	text-align: center;
	padding: 10px;
	width: 58px;
	color: var(--wanikani);
	font-weight: bold;
	flex: 0 0 auto;
}

.level .values {
	display: flex;
	flex-direction: column;
}

.level .values > div {
	padding: 5px;
	display: flex;
	column-gap: 10px;
}

.level .values > div:first-child > div:first-child {
	font-weight: bold;
}

.level .values > div:not(:first-child) {
	opacity: 0.3;
	padding-left: 10px;
}

.level .values > div > div:nth-child(2) {
	opacity: 0.7;
}

.progress-bar {
	margin-right: 10px;
	flex: 1 1 auto;
}

.progress-bar .outer {
	width: 100%;
	height: 13px;
	border: 1px solid #c8c8d6;
	border-radius: 10px;
	overflow: hidden;
}

.progress-bar .progress {
	background-color: var(--wanikani-sec);
	height: 100%;
	text-align: center;
	color: white;
	font-weight: bold;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 12px;
}
</style>
