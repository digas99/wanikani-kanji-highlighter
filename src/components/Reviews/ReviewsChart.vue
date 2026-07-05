<template>
	<div class="reviews-chart">
		<p class="reviews-chart-summary">
			<b>{{ summaryCount }}</b> {{ summaryLabel }}
		</p>

		<div class="reviews-chart-nav">
			<button
				type="button"
				class="chart-arrow"
				:disabled="!canGoPrevious"
				:title="previousLabel"
				aria-label="Previous period"
				@click="shiftView(-1)"
			>
				<i class="left"></i>
			</button>

			<span class="reviews-chart-nav-label">{{ navLabel }}</span>

			<button
				type="button"
				class="chart-arrow"
				:disabled="!canGoNext"
				:title="nextLabel"
				aria-label="Next period"
				@click="shiftView(1)"
			>
				<i class="right"></i>
			</button>
		</div>

		<div class="reviews-chart-canvas-wrap">
			<canvas ref="canvas"></canvas>
		</div>

		<div class="reviews-chart-day-picker">
			<label for="reviews-day-picker">Select another day:</label>
			<input
				id="reviews-day-picker"
				type="date"
				:value="dateInputValue"
				:min="minDateValue"
				:max="maxDateValue"
				@change="onDateInput"
			/>
		</div>
	</div>
</template>

<script>
import {
	Chart,
	BarController,
	BarElement,
	CategoryScale,
	LinearScale,
	Title,
	Legend,
	Tooltip,
} from 'chart.js';

import {
	CHART_DATASET_ORDER,
	CHART_GROUP_COLORS,
	CHART_GROUP_LABELS,
	addDays,
	buildDayChart,
	buildNext24HourChart,
	formatDayHeading,
	formatDateTime,
	fromDateInputValue,
	getFutureReviewAssignments,
	getReviewsOnDay,
	getReviewsWithinHours,
	startOfDay,
	toDateInputValue,
} from '@/utils/scripts/reviewChart';

const stackTotalLabelsPlugin = {
	id: 'stackTotalLabels',
	afterDatasetsDraw(chart) {
		const { ctx, data } = chart;
		if (!data.datasets.length || !data.labels.length) return;

		const fontColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--default-color')
			.trim() || '#2a2d48';

		ctx.save();
		ctx.fillStyle = fontColor;
		ctx.font = '11px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'bottom';

		for (let index = 0; index < data.labels.length; index++) {
			const total = data.datasets.reduce(
				(sum, dataset) => sum + (Number(dataset.data[index]) || 0),
				0,
			);
			if (!total) continue;

			let topBar = null;
			for (let i = data.datasets.length - 1; i >= 0; i--) {
				if (!data.datasets[i].data[index]) continue;
				topBar = chart.getDatasetMeta(i).data[index];
				if (topBar) break;
			}
			if (!topBar) continue;

			ctx.fillText(String(total), topBar.x, topBar.y - 4);
		}

		ctx.restore();
	},
};

Chart.register(
	BarController,
	BarElement,
	CategoryScale,
	LinearScale,
	Title,
	Legend,
	Tooltip,
	stackTotalLabelsPlugin,
);

export default {
	name: 'ReviewsChart',

	props: {
		assignments: {
			type: Array,
			default: () => [],
		},
		use12h: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['select', 'reset'],

	data() {
		const today = startOfDay(new Date());
		return {
			chart: null,
			mode: 'next24h',
			selectedDay: today,
			selectedSlotIndex: null,
			minDay: addDays(today, 1),
			maxDay: addDays(today, 13),
			chartReady: false,
		};
	},

	computed: {
		futureAssignments() {
			return getFutureReviewAssignments(this.assignments);
		},
		chartData() {
			if (this.mode === 'next24h') {
				return buildNext24HourChart(this.futureAssignments, this.use12h);
			}
			return buildDayChart(this.futureAssignments, this.selectedDay, this.use12h);
		},
		chartTitle() {
			if (this.mode === 'next24h') {
				return 'Reviews in the next 24 hours';
			}
			return `Reviews on ${formatDayHeading(this.selectedDay)}`;
		},
		summaryCount() {
			return this.chartData.total;
		},
		summaryLabel() {
			if (this.mode === 'next24h') {
				return 'more Reviews in the next 24 hours';
			}
			return `Reviews on ${formatDayHeading(this.selectedDay)}`;
		},
		dateInputValue() {
			if (this.mode === 'next24h') return '';
			return toDateInputValue(this.selectedDay);
		},
		minDateValue() {
			return toDateInputValue(this.minDay);
		},
		maxDateValue() {
			return toDateInputValue(this.maxDay);
		},
		navLabel() {
			if (this.mode === 'next24h') {
				return 'Next 24 hours';
			}
			return formatDayHeading(this.selectedDay);
		},
		canGoPrevious() {
			return this.mode === 'day';
		},
		canGoNext() {
			if (this.mode === 'next24h') return true;
			return this.selectedDay.getTime() < this.maxDay.getTime();
		},
		previousLabel() {
			if (this.mode === 'day' && this.selectedDay.getTime() === this.minDay.getTime()) {
				return 'Next 24 hours';
			}
			return formatDayHeading(addDays(this.selectedDay, -1));
		},
		nextLabel() {
			if (this.mode === 'next24h') {
				return formatDayHeading(this.minDay);
			}
			return formatDayHeading(addDays(this.selectedDay, 1));
		},
	},

	watch: {
		assignments() {
			this.scheduleRebuild();
		},
		mode() {
			this.scheduleRebuild();
		},
		selectedDay() {
			if (this.mode === 'day') this.scheduleRebuild();
		},
	},

	mounted() {
		this.rebuildChart();
	},

	beforeUnmount() {
		this.cancelScheduledRebuild();
		this.destroyChart();
	},

	methods: {
		cancelScheduledRebuild() {
			if (this._rebuildFrame) {
				cancelAnimationFrame(this._rebuildFrame);
				this._rebuildFrame = null;
			}
		},

		scheduleRebuild() {
			if (!this.chartReady) return;
			this.cancelScheduledRebuild();
			this._rebuildFrame = requestAnimationFrame(() => {
				this._rebuildFrame = null;
				this.rebuildChart();
			});
		},

		destroyChart() {
			if (this.chart) {
				this.chart.destroy();
				this.chart = null;
			}
		},

		buildChartJsData() {
			const { labels, datasets } = this.chartData;
			const rootStyle = getComputedStyle(document.documentElement);
			const highlight = rootStyle.getPropertyValue('--wanikani-sec').trim() || '#00aaff';
			const barBorder = rootStyle.getPropertyValue('--fill-color').trim() || '#ffffff';

			return {
				labels: [...labels],
				datasets: CHART_DATASET_ORDER.map((key, index) => ({
					label: CHART_GROUP_LABELS[key],
					data: [...datasets[key]],
					backgroundColor: datasets[key].map((_value, barIndex) => (
						this.selectedSlotIndex === barIndex ? highlight : CHART_GROUP_COLORS[key]
					)),
					borderColor: barBorder,
					borderWidth: 1,
					order: index + 1,
				})),
			};
		},

		buildChartOptions() {
			const style = getComputedStyle(document.documentElement);
			const fontColor = style.getPropertyValue('--font-color').trim()
				|| style.getPropertyValue('--default-color').trim()
				|| '#2a2d48';
			const gridColor = style.getPropertyValue('--surface-border-color').trim() || 'rgba(42, 45, 72, 0.12)';

			return {
				responsive: true,
				maintainAspectRatio: false,
				animation: false,
				events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
				interaction: {
					mode: 'index',
					intersect: false,
				},
				plugins: {
					title: {
						display: true,
						text: this.chartTitle,
						padding: 16,
						color: fontColor,
					},
					legend: {
						position: 'bottom',
						labels: {
							padding: 8,
							color: fontColor,
						},
					},
					tooltip: {
						mode: 'index',
						intersect: false,
						callbacks: {
							footer: items => {
								const total = items.reduce((sum, item) => sum + (item.parsed.y || 0), 0);
								return total ? `Total: ${total}` : '';
							},
						},
					},
				},
				scales: {
					x: {
						stacked: true,
						ticks: { color: fontColor, maxRotation: 0, autoSkip: true },
						grid: { color: gridColor },
					},
					y: {
						stacked: true,
						beginAtZero: true,
						ticks: {
							color: fontColor,
							precision: 0,
						},
						grid: { color: gridColor },
					},
				},
				onClick: (_event, elements) => this.onChartClick(elements),
				onHover: (event, elements) => {
					const target = event?.native?.target;
					if (target) target.style.cursor = elements.length ? 'pointer' : 'default';
				},
			};
		},

		rebuildChart() {
			if (!this.$refs.canvas) return;

			this.destroyChart();

			this.chart = new Chart(this.$refs.canvas, {
				type: 'bar',
				data: this.buildChartJsData(),
				options: this.buildChartOptions(),
			});

			this.chartReady = true;
		},

		updateHighlight() {
			if (!this.chart) return;

			const highlight = getComputedStyle(document.documentElement)
				.getPropertyValue('--wanikani-sec')
				.trim() || '#00aaff';

			this.chart.data.datasets.forEach((dataset, datasetIndex) => {
				const key = CHART_DATASET_ORDER[datasetIndex];
				dataset.backgroundColor = dataset.data.map((_value, barIndex) => (
					this.selectedSlotIndex === barIndex ? highlight : CHART_GROUP_COLORS[key]
				));
			});

			this.chart.update('none');
		},

		onChartClick(elements) {
			if (elements.length) {
				const index = elements[0].index;
				this.selectedSlotIndex = index;
				this.updateHighlight();

				const slotAssignments = this.getAssignmentsForSlot(index);
				const slotStart = this.chartData.slots[index];
				this.$emit('select', {
					assignments: slotAssignments,
					title: formatDateTime(slotStart),
				});
				return;
			}

			this.selectedSlotIndex = null;
			this.updateHighlight();

			if (this.mode === 'day') {
				this.$emit('select', {
					assignments: getReviewsOnDay(this.futureAssignments, this.selectedDay),
					title: formatDayHeading(this.selectedDay),
				});
				return;
			}

			this.$emit('select', {
				assignments: getReviewsWithinHours(this.futureAssignments, new Date(), 24),
				title: 'the next 24 hours',
			});
		},

		getAssignmentsForSlot(index) {
			const slotStart = this.chartData.slots[index];
			if (!slotStart) return [];
			const slotEnd = new Date(slotStart);
			slotEnd.setHours(slotEnd.getHours() + 1);

			return this.futureAssignments.filter(assignment => {
				const availableAt = new Date(assignment.available_at);
				return availableAt >= slotStart && availableAt < slotEnd;
			});
		},

		onDateInput(event) {
			const value = event.target.value;
			if (!value) return;

			const picked = startOfDay(fromDateInputValue(value));
			if (picked < this.minDay || picked > this.maxDay) return;

			this.selectedSlotIndex = null;
			this.selectedDay = picked;
			this.mode = 'day';
			this.$emit('reset');
		},

		shiftView(delta) {
			this.selectedSlotIndex = null;
			this.$emit('reset');

			if (delta < 0) {
				if (this.mode === 'day' && this.selectedDay.getTime() === this.minDay.getTime()) {
					this.mode = 'next24h';
					return;
				}
				if (this.mode === 'day') {
					this.selectedDay = startOfDay(addDays(this.selectedDay, -1));
				}
				return;
			}

			if (this.mode === 'next24h') {
				this.mode = 'day';
				this.selectedDay = startOfDay(this.minDay);
				return;
			}

			if (this.selectedDay.getTime() < this.maxDay.getTime()) {
				this.selectedDay = startOfDay(addDays(this.selectedDay, 1));
			}
		},
	},
};
</script>

<style scoped>
.reviews-chart {
	margin-top: 12px;
	padding: 10px 8px 14px;
	background: var(--surface-muted-color);
	border: 1px solid var(--surface-border-color);
	border-radius: 10px;
}

.reviews-chart-summary {
	margin: 0 4px 8px;
	text-align: right;
	color: var(--font-sec-color);
}

.reviews-chart-summary b {
	color: var(--reviews-color);
}

.reviews-chart-nav {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 4px 6px;
}

.reviews-chart-nav-label {
	flex: 1;
	text-align: center;
	font-size: 13px;
	color: var(--font-sec-color);
	font-weight: bold;
}

.reviews-chart-canvas-wrap {
	width: 100%;
	height: 260px;
}

.chart-arrow {
	border: none;
	background: transparent;
	padding: 6px;
	cursor: pointer;
}

.chart-arrow:disabled {
	opacity: 0.25;
	cursor: default;
}

.chart-arrow > i {
	display: inline-block;
	border: solid var(--chart-arrow-color);
	border-width: 0 3px 3px 0;
	padding: 5px;
}

.chart-arrow > i.left {
	transform: rotate(135deg);
}

.chart-arrow > i.right {
	transform: rotate(-45deg);
}

.reviews-chart-day-picker {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: 8px;
	margin-top: 10px;
	color: var(--font-sec-color);
	font-size: 13px;
}

.reviews-chart-day-picker input {
	padding: 5px 8px;
	border: 1px solid var(--surface-border-color);
	border-radius: 6px;
	background: var(--fill-color);
	color: var(--font-color);
	font-family: inherit;
	font-size: 12px;
}
</style>
