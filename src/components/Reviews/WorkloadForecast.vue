<template>
	<!-- "if I do N lessons a day, my reviews look like…" -->
	<section class="workload">
		<header class="workload-head">
			<span class="workload-title">Workload forecast</span>
			<InfoTip class="workload-info" label="How the forecast is worked out">
				An estimate: every review done when it's due, {{ accuracy }}% of subjects answered all right.
				<template v-if="lessonsPerDay"> You have {{ lessonsAvailable }} lessons now; more unlock as you level up.</template>
			</InfoTip>
			<div class="workload-days" role="radiogroup" aria-label="Days ahead">
				<button
					v-for="option in DAY_OPTIONS"
					:key="option"
					type="button"
					role="radio"
					:aria-checked="days === option"
					:class="{ active: days === option }"
					@click="days = option"
				>{{ option }}d</button>
			</div>
		</header>

		<div class="workload-controls">
			<label class="workload-slider">
				<span class="workload-slider-label">Lessons a day <b>{{ lessonsPerDay }}</b></span>
				<input v-model.number="lessonsPerDay" type="range" min="0" max="40" step="1" />
			</label>
			<label class="workload-slider">
				<span class="workload-slider-label">Answered right <b>{{ accuracy }}%</b></span>
				<input v-model.number="accuracy" type="range" min="50" max="100" step="1" />
			</label>
		</div>

		<div class="workload-canvas-wrap">
			<canvas ref="canvas"></canvas>
		</div>

		<div class="workload-stats">
			<div class="workload-stat">
				<b>{{ average }}</b>
				<small>reviews a day</small>
			</div>
			<div class="workload-stat">
				<b>{{ peak.total }}</b>
				<small>peak · {{ peak.label }}</small>
			</div>
			<div class="workload-stat" :title="apprenticeTitle">
				<b>{{ apprenticeNow }} → {{ apprenticeEnd }}</b>
				<small>Apprentice</small>
			</div>
		</div>

	</section>
</template>

<script>
import {
	Chart,
	BarController,
	BarElement,
	CategoryScale,
	LinearScale,
	Legend,
	Tooltip,
} from 'chart.js';
import { markRaw } from 'vue';
import { useWKStore } from '@/stores';
import { apprenticeCount, forecastWorkload } from '@/utils/scripts/workloadForecast';
import InfoTip from '@/components/InfoTip.vue';
import { THEME_CHANGE_EVENT } from '@/utils/scripts/theme';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip);

const DAY_OPTIONS = [7, 14, 30];
const PREFS_KEY = 'wkh:workloadForecast';

function readPrefs() {
	try {
		return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') ?? {};
	} catch {
		return {};
	}
}

export default {
	name: 'WorkloadForecast',

	components: { InfoTip },

	props: {
		assignments: { type: Array, default: () => [] },
	},

	data() {
		const prefs = readPrefs();
		return {
			DAY_OPTIONS,
			days: DAY_OPTIONS.includes(prefs.days) ? prefs.days : 14,
			lessonsPerDay: Number.isFinite(prefs.lessonsPerDay) ? prefs.lessonsPerDay : 10,
			accuracy: Number.isFinite(prefs.accuracy) ? prefs.accuracy : 85,
		};
	},

	computed: {
		forecast() {
			return forecastWorkload(this.assignments, {
				days: this.days,
				lessonsPerDay: this.lessonsPerDay,
				accuracy: this.accuracy / 100,
			});
		},
		average() {
			if (!this.forecast.length) return 0;
			return Math.round(this.forecast.reduce((sum, day) => sum + day.total, 0) / this.forecast.length);
		},
		peak() {
			const top = this.forecast.reduce((best, day) => (day.total > (best?.total ?? -1) ? day : best), null);
			if (!top) return { total: 0, label: '–' };
			return { total: top.total, label: this.dayLabel(top.date, true) };
		},
		apprenticeNow() {
			return apprenticeCount(this.assignments);
		},
		apprenticeEnd() {
			return this.forecast.at(-1)?.apprentice ?? this.apprenticeNow;
		},
		apprenticeTitle() {
			return `Subjects in Apprentice now, and in ${this.days} days. Around 100–150 is a common comfortable amount.`;
		},
		lessonsAvailable() {
			return useWKStore().summary?.lessons?.length ?? 0;
		},
	},

	watch: {
		forecast() {
			this.scheduleRebuild();
		},
		days: 'savePrefs',
		lessonsPerDay: 'savePrefs',
		accuracy: 'savePrefs',
	},

	mounted() {
		this.rebuildChart();
		window.addEventListener(THEME_CHANGE_EVENT, this.scheduleRebuild);
	},

	beforeUnmount() {
		window.removeEventListener(THEME_CHANGE_EVENT, this.scheduleRebuild);
		if (this._frame) cancelAnimationFrame(this._frame);
		this.chart?.destroy();
		this.chart = null;
	},

	methods: {
		dayLabel(date, long = false) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			if (date.getTime() === today.getTime()) return 'Today';
			return long
				? date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
				: date.toLocaleDateString(undefined, this.days > 14 ? { day: 'numeric' } : { weekday: 'short' });
		},
		savePrefs() {
			try {
				localStorage.setItem(PREFS_KEY, JSON.stringify({ days: this.days, lessonsPerDay: this.lessonsPerDay, accuracy: this.accuracy }));
			} catch {
				// only a convenience
			}
		},
		scheduleRebuild() {
			if (this._frame) cancelAnimationFrame(this._frame);
			this._frame = requestAnimationFrame(() => {
				this._frame = null;
				this.rebuildChart();
			});
		},
		rebuildChart() {
			if (!this.$refs.canvas) return;
			const style = getComputedStyle(document.documentElement);
			const fontColor = style.getPropertyValue('--font-color').trim() || '#2a2d48';
			const gridColor = style.getPropertyValue('--surface-border-color').trim() || 'rgba(42, 45, 72, 0.12)';
			const reviewsColor = style.getPropertyValue('--reviews-color').trim() || '#00aaff';
			const lessonsColor = style.getPropertyValue('--wanikani').trim() || '#f100a1';
			const data = {
				labels: this.forecast.map(day => this.dayLabel(day.date)),
				datasets: [
					{ label: 'Already scheduled', data: this.forecast.map(day => day.base), backgroundColor: reviewsColor, borderRadius: 3 },
					{ label: 'From new lessons', data: this.forecast.map(day => Math.max(0, day.total - day.base)), backgroundColor: lessonsColor, borderRadius: 3 },
				],
			};
			// sliders move often: update in place
			if (this.chart) {
				this.chart.data = data;
				this.chart.options.scales.x.ticks.color = fontColor;
				this.chart.options.scales.y.ticks.color = fontColor;
				this.chart.options.plugins.legend.labels.color = fontColor;
				this.chart.update('none');
				return;
			}
			// markRaw: a reactive Chart.js instance recurses endlessly on update
			this.chart = markRaw(new Chart(this.$refs.canvas, {
				type: 'bar',
				data,
				options: {
					responsive: true,
					maintainAspectRatio: false,
					animation: false,
					interaction: { mode: 'index', intersect: false },
					plugins: {
						legend: { position: 'bottom', labels: { color: fontColor, padding: 8, boxWidth: 12 } },
						tooltip: {
							callbacks: {
								title: items => this.dayLabel(this.forecast[items[0].dataIndex].date, true),
								footer: items => `Total: ${items.reduce((sum, item) => sum + (item.parsed.y || 0), 0)}`,
							},
						},
					},
					scales: {
						x: { stacked: true, ticks: { color: fontColor, maxRotation: 0, autoSkip: true }, grid: { display: false } },
						y: { stacked: true, beginAtZero: true, ticks: { color: fontColor, precision: 0 }, grid: { color: gridColor } },
					},
				},
			}));
		},
	},
};
</script>

<style scoped>
/* as the reviews chart above */
.workload {
	margin-top: 12px;
	padding: 10px 10px 12px;
	background: var(--surface-muted-color);
	border: 1px solid var(--surface-border-color);
	border-radius: 10px;
}

.workload-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin-bottom: 10px;
}

.workload-title {
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

.workload-days {
	display: flex;
	gap: 2px;
	padding: 2px;
	border-radius: 8px;
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
}

.workload-days button {
	border: none;
	background: transparent;
	color: var(--tab-inactive-color);
	font-family: inherit;
	font-size: 11.5px;
	font-weight: 700;
	padding: 3px 10px;
	border-radius: 6px;
	cursor: pointer;
}

.workload-days button.active {
	background: var(--pill-color, #e36f94);
	color: #fff;
}

.workload-controls {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px;
	margin: 0 4px 8px;
}

.workload-slider {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.workload-slider-label {
	font-size: 11.5px;
	color: var(--font-sec-color);
}

.workload-slider-label b {
	color: var(--font-color);
	font-variant-numeric: tabular-nums;
}

.workload-slider input {
	width: 100%;
	accent-color: var(--pill-color, #e36f94);
}

.workload-canvas-wrap {
	height: 200px;
}

.workload-stats {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 6px;
	margin-top: 8px;
}

.workload-stat {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 6px 4px;
	border-radius: 8px;
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	min-width: 0;
}

.workload-stat b {
	font-size: 15px;
	color: var(--heading-color, #2a2d48);
	font-variant-numeric: tabular-nums;
}

.workload-stat small {
	font-size: 10.5px;
	color: var(--font-sec-color);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 100%;
}

.workload-info {
	flex-shrink: 0;
	margin-right: auto;
	color: var(--font-sec-color);
}
</style>
