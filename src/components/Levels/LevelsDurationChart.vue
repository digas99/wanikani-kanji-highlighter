<template>
	<!-- days spent on each level, a learning streak (the levels between resets) at a time -->
	<section class="levels-duration-chart">
		<header class="chart-head">
			<span class="chart-title">Days per level</span>
			<span class="chart-summary">{{ streakLabel }}</span>
		</header>
		<div class="chart-body">
			<div class="chart-controls">
				<div class="chart-segments" role="radiogroup" aria-label="Levels shown">
					<button
						v-for="option in dataSizeOptions"
						:key="option"
						type="button"
						role="radio"
						:aria-checked="dataSize === option"
						:class="{ active: dataSize === option }"
						:title="option === 60 ? 'All the levels' : `The last ${option} levels`"
						@click="setDataSize(option)"
					>{{ option === 60 ? 'All' : option }}</button>
				</div>
				<div v-if="learningStreaks > 1" class="chart-segments" role="radiogroup" aria-label="Learning streak">
					<button
						v-for="streak in streakOptions"
						:key="streak.index"
						type="button"
						role="radio"
						:aria-checked="resetIndex === streak.index"
						:class="{ active: resetIndex === streak.index }"
						:title="streak.title"
						@click="resetIndex = streak.index"
					>{{ streak.label }}</button>
				</div>
			</div>
			<div class="levels-chart-canvas-wrap">
				<canvas ref="canvas"></canvas>
			</div>
			<div class="footnote">Log scale, so short and long levels both fit</div>
		</div>
	</section>
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
import { THEME_CHANGE_EVENT } from '@/utils/scripts/theme';
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
		// text color, not the panel color (near-black in dark mode)
		ctx.fillStyle = getComputedStyle(document.documentElement)
			.getPropertyValue('--font-color')
			.trim() || '#343434';
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
);

const DATA_SIZE_OPTIONS = [5, 10, 15, 20, 60];

/** Log axis: only 1, 2, 5, 10, 20, 50… labelled (the rest crowd together). */
function logTick(value) {
	const number = Number(value);
	const leading = number / 10 ** Math.floor(Math.log10(number));
	return [1, 2, 5].some(digit => Math.abs(leading - digit) < 1e-6) ? number : '';
}

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
		/** oldest streak first; labelled by its years */
		streakOptions() {
			if (!this.plainLevelsStats) return [];
			return Array.from({ length: this.learningStreaks }, (_, i) => {
				const index = this.learningStreaks - 1 - i;
				const { streakBeginning, streakEnding } = streakDates(this.plainLevelsStats, index);
				const from = streakBeginning.getFullYear();
				const to = streakEnding ? streakEnding.getFullYear() : null;
				let label;
				if (!to) label = index === 0 ? `${from}–now` : String(from);
				else label = from === to ? String(from) : `${from}–${String(to).slice(-2)}`;
				return {
					index,
					label,
					title: `Learning streak ${i + 1}: ${formatStreakDate(streakBeginning)} – ${formatStreakDate(streakEnding)}`,
				};
			});
		},
		streakLabel() {
			if (!this.plainLevelsStats) return '';
			const { streakBeginning, streakEnding } = streakDates(this.plainLevelsStats, this.resetIndex);
			return `${formatStreakDate(streakBeginning)} – ${formatStreakDate(streakEnding)}`;
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
		window.addEventListener(THEME_CHANGE_EVENT, this.rebuildChart);
	},

	beforeUnmount() {
		window.removeEventListener(THEME_CHANGE_EVENT, this.rebuildChart);
		this.destroyChart();
	},

	methods: {
		destroyChart() {
			if (this.chart) {
				this.chart.destroy();
				this.chart = null;
			}
		},
		setDataSize(value) {
			this.settings.setSetting('levels', 'dataSize', value);
		},
		buildChartPayload() {
			const levelsStats = this.plainLevelsStats;
			if (!levelsStats) return null;

			const { labels, data } = getChartLevelData(
				levelsStats,
				this.resetIndex,
				this.dataSize,
			);
			const wanikaniColor = getComputedStyle(document.documentElement)
				.getPropertyValue('--wanikani')
				.trim() || '#f100a1';
			const horizontal = this.dataSize > 20 && Object.keys(levelsStats).length > 20;
			const rootStyle = getComputedStyle(document.documentElement);
			const fontColor = rootStyle.getPropertyValue('--font-color').trim() || '#343434';
			const gridColor = rootStyle.getPropertyValue('--surface-border-color').trim() || 'rgba(0, 0, 0, 0.1)';
			const themedAxis = extra => ({
				...extra,
				ticks: { ...(extra.ticks ?? {}), color: fontColor },
				grid: { color: gridColor },
				...(extra.title ? { title: { ...extra.title, color: fontColor } } : {}),
			});

			return {
				data: {
					labels: [...labels],
					datasets: [{
						label: 'Days',
						data: [...data],
						backgroundColor: wanikaniColor,
						borderRadius: 4,
						maxBarThickness: 28,
					}],
				},
				options: {
					responsive: true,
					maintainAspectRatio: true,
					animation: false,
					aspectRatio: horizontal ? 1 : 1.5,
					indexAxis: horizontal ? 'y' : 'x',
					// room above the bars for their labels (the card's header is the title)
					layout: { padding: { top: horizontal ? 0 : 18, right: horizontal ? 24 : 0 } },
					plugins: {
						title: {
							display: false,
						},
						legend: {
							display: false,
						},
					},
					scales: horizontal
						? {
							x: themedAxis({
								type: 'logarithmic',
								ticks: {
									callback: logTick,
								},
							}),
							y: themedAxis({}),
						}
						: {
							x: themedAxis({}),
							y: themedAxis({
								type: 'logarithmic',
								ticks: {
									callback: logTick,
								},
							}),
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
				// this chart only: registered globally, it labeled every segment of the reviews chart too
				plugins: [dataLabelPlugin],
			}));
		},
	},
};
</script>

<style scoped>
/* as Home's cards */
.levels-duration-chart {
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	border-radius: var(--card-radius, 12px);
	box-shadow: 0 2px 10px var(--shadow-soft-color);
	overflow: hidden;
}

.chart-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 12px 12px 0;
}

.chart-title {
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

.chart-summary {
	font-size: 12px;
	color: var(--font-sec-color);
	font-variant-numeric: tabular-nums;
}

.chart-body {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 10px 12px 12px;
}

/* how many levels on the left, which streak on the right */
.chart-controls {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 6px;
}

/* same segmented control as the activity calendar's */
.chart-segments {
	display: flex;
	gap: 2px;
	padding: 2px;
	border-radius: 8px;
	background: var(--surface-muted-color);
	border: 1px solid var(--surface-border-color);
}

.chart-segments button {
	min-width: 28px;
	border: none;
	background: transparent;
	color: var(--tab-inactive-color);
	font-family: inherit;
	font-size: 11px;
	font-weight: 700;
	padding: 4px 7px;
	border-radius: 6px;
	cursor: pointer;
	transition: background-color 0.2s, color 0.2s;
}

.chart-segments button.active {
	background: var(--pill-color, #e36f94);
	color: #fff;
}

.chart-segments button:hover:not(.active) {
	color: var(--heading-color, #2a2d48);
}

.levels-chart-canvas-wrap {
	min-height: 220px;
}

.footnote {
	font-size: 10.5px;
	font-style: italic;
	color: var(--font-sec-color);
	opacity: 0.85;
}
</style>
