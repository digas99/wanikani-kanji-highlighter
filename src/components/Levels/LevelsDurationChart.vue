<template>
	<div class="levels-duration-chart">
		<div class="levels-chart-canvas-wrap">
			<canvas ref="canvas"></canvas>
		</div>
		<div class="footnote">*The data on this chart is on a logarithmic scale</div>
		<div class="options">
			<div>
				<label for="levels-data-size">Number of levels to display</label>
				<select id="levels-data-size" :value="dataSize" @change="onDataSizeChange">
					<option v-for="option in dataSizeOptions" :key="option" :value="option">
						{{ option === 60 ? 'All' : `${option} Levels` }}
					</option>
				</select>
			</div>
			<div v-if="learningStreaks > 1">
				<label for="levels-past-resets">Past Resets</label>
				<select id="levels-past-resets" :value="selectedStreakValue" @change="onStreakChange">
					<option
						v-for="streak in learningStreaks"
						:key="streak"
						:value="streak - 1"
					>
						Learning Streak {{ streak }}
					</option>
				</select>
			</div>
		</div>
	</div>
</template>

<script>
import { markRaw, toRaw } from 'vue';
import {
	Chart,
	BarController,
	BarElement,
	CategoryScale,
	LinearScale,
	LogarithmicScale,
	Title,
	Tooltip,
} from 'chart.js';

import { useSettingsStore } from '@/stores/settings';
import {
	formatStreakDate,
	getChartLevelData,
	mostLearningStreaks,
	normalizeLevelsStats,
	streakDates,
} from '@/utils/scripts/levelStats';

const dataLabelPlugin = {
	id: 'levelsDurationLabels',
	afterDatasetsDraw(chart) {
		const { ctx } = chart;
		ctx.save();
		ctx.fillStyle = getComputedStyle(document.documentElement)
			.getPropertyValue('--default-color')
			.trim() || '#2a2d48';
		ctx.font = '11px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'bottom';

		chart.data.datasets.forEach((dataset, datasetIndex) => {
			const meta = chart.getDatasetMeta(datasetIndex);
			meta.data.forEach((bar, index) => {
				const value = dataset.data[index];
				if (!value) return;
				ctx.fillText(String(value), bar.x, bar.y - 4);
			});
		});

		ctx.restore();
	},
};

Chart.register(
	BarController,
	BarElement,
	CategoryScale,
	LinearScale,
	LogarithmicScale,
	Title,
	Tooltip,
	dataLabelPlugin,
);

const DATA_SIZE_OPTIONS = [5, 10, 15, 20, 60];

export default {
	name: 'LevelsDurationChart',

	props: {
		levelsStats: {
			type: Object,
			default: null,
		},
	},

	data() {
		return {
			chart: null,
			resetIndex: 0,
			dataSizeOptions: DATA_SIZE_OPTIONS,
		};
	},

	computed: {
		settings() {
			return useSettingsStore();
		},
		dataSize() {
			return this.settings.settings.levels?.dataSize ?? 10;
		},
		plainLevelsStats() {
			if (!this.levelsStats) return null;
			return normalizeLevelsStats(toRaw(this.levelsStats));
		},
		learningStreaks() {
			return mostLearningStreaks(this.plainLevelsStats);
		},
		selectedStreakValue() {
			return this.learningStreaks - this.resetIndex - 1;
		},
	},

	watch: {
		levelsStats() {
			this.resetIndex = 0;
			this.rebuildChart();
		},
		dataSize() {
			this.rebuildChart();
		},
		resetIndex() {
			this.rebuildChart();
		},
	},

	mounted() {
		this.rebuildChart();
	},

	beforeUnmount() {
		this.destroyChart();
	},

	methods: {
		destroyChart() {
			if (this.chart) {
				this.chart.destroy();
				this.chart = null;
			}
		},
		onDataSizeChange(event) {
			const value = Number(event.target.value);
			this.settings.setSetting('levels', 'dataSize', value);
		},
		onStreakChange(event) {
			const optionValue = Number(event.target.value);
			this.resetIndex = this.learningStreaks - (optionValue + 1);
		},
		buildChartPayload() {
			const levelsStats = this.plainLevelsStats;
			if (!levelsStats) return null;

			const { labels, data } = getChartLevelData(
				levelsStats,
				this.resetIndex,
				this.dataSize,
			);
			const { streakBeginning, streakEnding } = streakDates(levelsStats, this.resetIndex);
			const wanikaniColor = getComputedStyle(document.documentElement)
				.getPropertyValue('--wanikani')
				.trim() || '#f100a1';
			const horizontal = this.dataSize > 20 && Object.keys(levelsStats).length > 20;

			const titleLines = [
				`Levels duration in days (Streak ${this.learningStreaks - this.resetIndex})`,
				`${formatStreakDate(streakBeginning)} - ${formatStreakDate(streakEnding)}`,
			];

			return {
				data: {
					labels: [...labels],
					datasets: [{
						label: 'Days',
						data: [...data],
						backgroundColor: wanikaniColor,
					}],
				},
				options: {
					responsive: true,
					maintainAspectRatio: true,
					animation: false,
					aspectRatio: horizontal ? 1 : 1.5,
					indexAxis: horizontal ? 'y' : 'x',
					plugins: {
						title: {
							display: true,
							text: titleLines,
							padding: 30,
						},
						legend: {
							display: false,
						},
					},
					scales: horizontal
						? {
							x: {
								type: 'logarithmic',
								ticks: {
									callback(value) {
										return Number(value.toString());
									},
								},
							},
							y: {},
						}
						: {
							x: {
								title: {
									display: true,
									text: 'Levels',
								},
							},
							y: {
								type: 'logarithmic',
								ticks: {
									callback(value) {
										return Number(value.toString());
									},
								},
							},
						},
				},
			};
		},
		rebuildChart() {
			if (!this.plainLevelsStats || !this.$refs.canvas) return;

			const payload = this.buildChartPayload();
			if (!payload) return;

			this.destroyChart();
			this.chart = markRaw(new Chart(this.$refs.canvas, {
				type: 'bar',
				data: payload.data,
				options: payload.options,
			}));
		},
	},
};
</script>

<style scoped>
.levels-duration-chart {
	display: flex;
	flex-direction: column;
	row-gap: 10px;
	padding: 0 15px 15px;
}

.levels-chart-canvas-wrap {
	min-height: 220px;
}

.footnote {
	text-align: right;
	color: var(--muted-color);
	font-size: 11px;
}

.options {
	text-align: right;
	display: flex;
	flex-direction: column;
	row-gap: 5px;
}

.options label {
	color: var(--muted-color);
}

.options select {
	margin-left: 5px;
	padding: 5px;
	border: 1px solid #c8c8d6;
	border-radius: 5px;
	background: var(--fill-color);
	color: var(--font-color);
	font-family: inherit;
	font-size: 12px;
}
</style>
