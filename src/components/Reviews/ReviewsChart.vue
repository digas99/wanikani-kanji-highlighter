<template>
	<div class="reviews-chart">
		<div class="reviews-chart-top">
			<div class="reviews-chart-views" role="radiogroup" aria-label="Chart or month">
				<button
					type="button"
					role="radio"
					:aria-checked="view === 'chart'"
					:class="{ active: view === 'chart' }"
					@click="view = 'chart'"
				>Chart</button>
				<button
					type="button"
					role="radio"
					:aria-checked="view === 'month'"
					:class="{ active: view === 'month' }"
					@click="view = 'month'"
				>Month</button>
			</div>
			<!-- back to the default: the next 24 hours, the reviews available now in the list -->
			<button
				type="button"
				class="reviews-chart-now"
				:class="{ hidden: isDefaultView }"
				:tabindex="isDefaultView ? -1 : 0"
				title="Back to the next 24 hours"
				@click="resetView"
			>Now</button>
		</div>

		<!-- month: which days have reviews coming -->
		<div v-if="view === 'month'" class="reviews-month">
			<div class="reviews-chart-nav">
				<button type="button" class="chart-arrow" :disabled="monthOffset === 0" title="Previous month" @click="monthOffset -= 1">
					<i class="left"></i>
				</button>
				<span class="reviews-chart-nav-label">
					{{ monthLabel }}
					<InfoTip class="reviews-month-info" label="About this calendar">
						Shows each subject's next review only: the ones after it depend on your answers.
					</InfoTip>
				</span>
				<button type="button" class="chart-arrow" :disabled="!canGoNextMonth" title="Next month" @click="monthOffset += 1">
					<i class="right"></i>
				</button>
			</div>
			<div class="reviews-month-weekdays" aria-hidden="true">
				<span v-for="(name, i) in weekdayNames" :key="i">{{ name }}</span>
			</div>
			<div class="reviews-month-grid">
				<button
					v-for="day in monthDays"
					:key="day.key"
					type="button"
					class="reviews-month-day"
					:class="[`level-${day.level}`, { blank: day.blank, past: day.past, today: day.today, 'level-up': day.levelUp }]"
					:style="day.style"
					:disabled="day.blank || day.past || (!day.count && !day.levelUp)"
					:title="day.title"
					@click="openDay(day)"
				>
					<template v-if="!day.blank">
						<span class="reviews-month-date">{{ day.date }}</span>
						<span v-if="day.count" class="reviews-month-count">{{ day.count }}</span>
						<span v-if="day.levelUp" class="reviews-levelup-mark" aria-hidden="true">▲</span>
					</template>
				</button>
			</div>
			<p v-if="levelUp" class="reviews-month-levelup">
				<span class="reviews-levelup-mark" aria-hidden="true">▲</span>
				{{ levelUp.label }}
			</p>
		</div>

		<div v-show="view === 'chart'" class="reviews-chart-nav">
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

		<div v-show="view === 'chart'" ref="canvasWrap" class="reviews-chart-canvas-wrap">
			<canvas ref="canvas"></canvas>
		</div>

		<p class="reviews-chart-summary">
			<b>{{ summaryCount }}</b> {{ summaryLabel }}
		</p>

		<!-- our own picker: the browser's date input can't gray out days without reviews -->
		<div v-show="view === 'chart'" ref="picker" class="reviews-chart-day-picker">
			<span>Select another day:</span>
			<button
				type="button"
				class="reviews-picker-toggle"
				:aria-expanded="pickerOpen"
				@click="togglePicker"
			>
				{{ pickerButtonLabel }}
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
			</button>

			<div v-if="pickerOpen" class="reviews-picker" role="dialog" aria-label="Pick a day">
				<div class="reviews-picker-nav">
					<button type="button" :disabled="pickerOffset === 0" title="Previous month" @click="pickerOffset -= 1">‹</button>
					<span>{{ monthName(pickerMonthStart) }}</span>
					<button type="button" :disabled="!hasMonthAfter(pickerMonthStart)" title="Next month" @click="pickerOffset += 1">›</button>
				</div>
				<div class="reviews-month-weekdays" aria-hidden="true">
					<span v-for="(name, i) in weekdayNames" :key="i">{{ name }}</span>
				</div>
				<div class="reviews-picker-grid">
					<button
						v-for="day in pickerDays"
						:key="day.key"
						type="button"
						class="reviews-picker-day"
						:class="{ blank: day.blank, empty: !day.blank && !day.selectable, selected: day.selected, today: day.today, 'level-up': day.levelUp }"
						:disabled="!day.selectable"
						:title="day.title"
						@click="pickDay(day)"
					>{{ day.blank ? '' : day.date }}</button>
				</div>
			</div>
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
import { markRaw } from 'vue';
import { useWKStore } from '@/stores';

import {
	CHART_DATASET_ORDER,
	CHART_GROUP_COLORS,
	CHART_GROUP_LABELS,
	addDays,
	buildDayChart,
	buildNext24HourChart,
	formatDayHeading,
	formatDateTime,
	getFutureReviewAssignments,
	getReviewsOnDay,
	getReviewsWithinHours,
	startOfDay,
} from '@/utils/scripts/reviewChart';
import { THEME_CHANGE_EVENT } from '@/utils/scripts/theme';
import InfoTip from '@/components/InfoTip.vue';

const stackTotalLabelsPlugin = {
	id: 'stackTotalLabels',
	afterDatasetsDraw(chart) {
		const { ctx, data } = chart;
		if (!data.datasets.length || !data.labels.length) return;

		// text color, not the panel color (that one is near-black in dark mode)
		const fontColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--font-color')
			.trim() || '#343434';

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

/** How far ahead the chart, the day picker and the month view look. */
const DAYS_AHEAD = 120;

const dayKey = date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

Chart.register(
	BarController,
	BarElement,
	CategoryScale,
	LinearScale,
	Title,
	Legend,
	Tooltip,
);

export default {
	name: 'ReviewsChart',

	components: { InfoTip },

	props: {
		assignments: {
			type: Array,
			default: () => [],
		},
		use12h: {
			type: Boolean,
			default: false,
		},
		/** a day to open on ("2027-01-13", from Home's calendar); its reviews in the list */
		initialDate: {
			type: String,
			default: '',
		},
	},

	emits: ['select', 'reset'],

	data() {
		const today = startOfDay(new Date());
		return {
			chart: null,
			/** 'chart' (24h / a day, by hour) or 'month' (calendar) */
			view: 'chart',
			monthOffset: 0,
			pickerOpen: false,
			pickerOffset: 0,
			mode: 'next24h',
			selectedDay: today,
			selectedSlotIndex: null,
			minDay: addDays(today, 1),
			maxDay: addDays(today, DAYS_AHEAD - 1),
			chartReady: false,
		};
	},

	computed: {
		futureAssignments() {
			return getFutureReviewAssignments(this.assignments, DAYS_AHEAD);
		},
		/** day → number of reviews becoming available that day */
		reviewsByDay() {
			const counts = new Map();
			for (const assignment of this.futureAssignments) {
				const key = dayKey(new Date(assignment.available_at));
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
			return counts;
		},
		monthStart() {
			return this.monthFromNow(this.monthOffset);
		},
		monthLabel() {
			return this.monthName(this.monthStart);
		},
		canGoNextMonth() {
			return this.hasMonthAfter(this.monthStart);
		},
		pickerMonthStart() {
			return this.monthFromNow(this.pickerOffset);
		},
		/** Days in the picker: only future days with reviews can be chosen. */
		pickerDays() {
			const days = [];
			const start = this.pickerMonthStart;
			for (let i = 0; i < start.getDay(); i += 1) days.push({ key: `b${i}`, blank: true });
			const cursor = new Date(start);
			while (cursor.getMonth() === start.getMonth()) {
				const day = new Date(cursor);
				const count = this.reviewsByDay.get(dayKey(day)) ?? 0;
				const inRange = day >= this.minDay && day <= this.maxDay;
				const levelUp = this.levelUp?.key === dayKey(day);
				days.push({
					key: dayKey(day),
					day,
					date: day.getDate(),
					selectable: inRange && count > 0,
					selected: this.mode === 'day' && day.getTime() === this.selectedDay.getTime(),
					today: day.getTime() === startOfDay(new Date()).getTime(),
					levelUp,
					title: [
						inRange ? `${formatDayHeading(day)}: ${count ? `${count} review${count === 1 ? '' : 's'}` : 'no reviews'}` : '',
						levelUp ? this.levelUp.label : '',
					].filter(Boolean).join('\n'),
				});
				cursor.setDate(cursor.getDate() + 1);
			}
			return days;
		},
		pickerButtonLabel() {
			if (this.mode !== 'day') return 'Pick a day';
			return this.selectedDay.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
		},
		weekdayNames() {
			// Sunday first, in the browser's language
			return Array.from({ length: 7 }, (_, i) =>
				new Date(2024, 0, 7 + i).toLocaleDateString(undefined, { weekday: 'narrow' }));
		},
		monthDays() {
			const today = startOfDay(new Date());
			const start = this.monthStart;
			const days = [];
			for (let i = 0; i < start.getDay(); i += 1) days.push({ key: `b${i}`, blank: true, level: 0 });

			const cursor = new Date(start);
			let max = 0;
			while (cursor.getMonth() === start.getMonth()) {
				const count = cursor < today ? 0 : this.reviewsByDay.get(dayKey(cursor)) ?? 0;
				max = Math.max(max, count);
				days.push({
					key: dayKey(cursor),
					day: new Date(cursor),
					date: cursor.getDate(),
					count,
					past: cursor < today,
					today: cursor.getTime() === today.getTime(),
					levelUp: this.levelUp?.key === dayKey(cursor),
				});
				cursor.setDate(cursor.getDate() + 1);
			}

			for (const day of days) {
				if (day.blank) continue;
				day.level = day.count && max ? Math.min(4, Math.ceil((day.count / max) * 4)) : 0;
				const alpha = [0, 0.25, 0.45, 0.7, 1][day.level];
				day.style = day.level
					? { backgroundColor: `color-mix(in srgb, var(--reviews-color, #00aaff) ${alpha * 100}%, var(--fill-color))` }
					: {};
				day.title = day.past
					? ''
					: [
						`${formatDayHeading(day.day)}: ${day.count ? `${day.count} review${day.count === 1 ? '' : 's'}` : 'no reviews'}`,
						day.levelUp ? this.levelUp.label : '',
					].filter(Boolean).join('\n');
			}
			return days;
		},
		/** The current level's fastest possible level up (marked on the calendars). */
		levelUp() {
			const fastest = useWKStore().fastestLevelUp;
			if (!fastest) return null;
			const at = new Date(Math.max(fastest.at, Date.now()));
			const when = at.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
			return {
				key: dayKey(at),
				label: `Fastest possible level up to ${fastest.level + 1}: ${when}`,
			};
		},
		/** The chart of the next 24 hours, no bar picked: nothing to go back to. */
		isDefaultView() {
			return this.view === 'chart' && this.mode === 'next24h' && this.selectedSlotIndex === null;
		},
		monthTotal() {
			return this.monthDays.reduce((sum, day) => sum + (day.count ?? 0), 0);
		},
		chartData() {
			if (this.mode === 'next24h') {
				return buildNext24HourChart(this.futureAssignments, this.use12h);
			}
			return buildDayChart(this.futureAssignments, this.selectedDay, this.use12h);
		},
		summaryCount() {
			return this.view === 'month' ? this.monthTotal : this.chartData.total;
		},
		summaryLabel() {
			if (this.view === 'month') {
				const name = this.monthStart.toLocaleDateString(undefined, { month: 'long' });
				return `Reviews coming in ${name}`;
			}
			if (this.mode === 'next24h') {
				return 'more Reviews in the next 24 hours';
			}
			return `Reviews on ${formatDayHeading(this.selectedDay)}`;
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
		// the canvas was hidden: size and draw it again now that it shows
		view(view) {
			if (view === 'chart') this.$nextTick(() => this.rebuildChart());
		},
	},

	mounted() {
		this.openInitialDate();
		this.rebuildChart();
		window.addEventListener(THEME_CHANGE_EVENT, this.scheduleRebuild);
		document.addEventListener('click', this.onOutsideChartClick, true);
		// the calendars mark the day of the fastest possible level up
		void useWKStore().refreshFastestLevelUp();
	},

	beforeUnmount() {
		window.removeEventListener(THEME_CHANGE_EVENT, this.scheduleRebuild);
		document.removeEventListener('click', this.onOutsideChartClick, true);
		this.closePicker();
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
				// room for the totals printed above the bars (no title there anymore)
				layout: { padding: { top: 18 } },
				animation: false,
				events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
				interaction: {
					mode: 'index',
					intersect: false,
				},
				plugins: {
					// the period is already named above the chart
					title: {
						display: false,
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
					if (target) target.style.cursor = elements.length && this.slotTotal(elements[0].index) ? 'pointer' : 'default';
				},
			};
		},

		rebuildChart() {
			if (!this.$refs.canvas) return;

			this.destroyChart();

			// markRaw: a reactive (proxied) Chart.js instance recurses endlessly on update
			// ("Maximum call stack size exceeded" when a bar is clicked)
			this.chart = markRaw(new Chart(this.$refs.canvas, {
				type: 'bar',
				data: this.buildChartJsData(),
				options: this.buildChartOptions(),
				// this chart only: registered globally, it also labeled the levels chart (and theirs this one)
				plugins: [stackTotalLabelsPlugin],
			}));

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

		/** Reviews in one hour column (clicks land on a column even where there's no bar). */
		slotTotal(index) {
			return CHART_DATASET_ORDER.reduce((sum, key) => sum + (Number(this.chartData.datasets[key]?.[index]) || 0), 0);
		},

		onChartClick(elements) {
			// an hour without reviews counts as clicking the background
			if (elements.length && !this.slotTotal(elements[0].index)) elements = [];
			if (elements.length) {
				const index = elements[0].index;
				this.selectedSlotIndex = index;
				this.updateHighlight();

				const slotAssignments = this.getAssignmentsForSlot(index);
				const slotStart = this.chartData.slots[index];
				this.$emit('select', {
					assignments: slotAssignments,
					title: formatDateTime(slotStart),
					// a bar: bring the list (above the chart) into view
					reveal: true,
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

		monthFromNow(offset) {
			const today = startOfDay(new Date());
			return new Date(today.getFullYear(), today.getMonth() + offset, 1);
		},
		monthName(date) {
			return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
		},
		hasMonthAfter(monthStart) {
			return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1) <= this.maxDay;
		},

		togglePicker() {
			if (this.pickerOpen) {
				this.closePicker();
				return;
			}
			// open on the month being shown (or the current one)
			const shown = this.mode === 'day' ? this.selectedDay : new Date();
			const now = new Date();
			this.pickerOffset = (shown.getFullYear() - now.getFullYear()) * 12 + shown.getMonth() - now.getMonth();
			this.pickerOpen = true;
			document.addEventListener('pointerdown', this.onOutsidePicker, true);
			document.addEventListener('keydown', this.onPickerKey, true);
		},
		closePicker() {
			this.pickerOpen = false;
			document.removeEventListener('pointerdown', this.onOutsidePicker, true);
			document.removeEventListener('keydown', this.onPickerKey, true);
		},
		onOutsidePicker(event) {
			if (!this.$refs.picker?.contains(event.target)) this.closePicker();
		},
		onPickerKey(event) {
			if (event.key === 'Escape') this.closePicker();
		},
		pickDay(day) {
			if (!day.selectable) return;
			this.selectedSlotIndex = null;
			this.selectedDay = startOfDay(day.day);
			this.mode = 'day';
			this.closePicker();
			this.emitShownPeriod();
		},
		/**
		 * The list above follows the chart: a day shows that day's reviews; "Next 24 hours"
		 * goes back to the reviews available right now.
		 */
		emitShownPeriod() {
			if (this.mode === 'day') {
				this.$emit('select', {
					assignments: getReviewsOnDay(this.futureAssignments, this.selectedDay),
					title: formatDayHeading(this.selectedDay),
				});
			} else {
				this.$emit('reset');
			}
		},

		/** Month view → that day's chart by hour, and its reviews in the list below. */
		openDay(day) {
			if (day.blank || day.past || !day.count) return;
			this.selectedSlotIndex = null;
			if (day.today) {
				this.mode = 'next24h';
			} else {
				this.selectedDay = startOfDay(day.day);
				this.mode = 'day';
			}
			this.view = 'chart';
			this.$emit('select', {
				assignments: getReviewsOnDay(this.futureAssignments, day.day),
				title: formatDayHeading(day.day),
			});
		},

		/**
		 * A bar picked, a click outside the chart: back to the whole period (the day, or the next
		 * 24 hours). Not the list's own controls (sorting, menus) nor the chart's buttons.
		 */
		onOutsideChartClick(event) {
			if (this.selectedSlotIndex === null || this.view !== 'chart') return;
			const target = event.target;
			if (!(target instanceof Element)) return;
			if (this.$refs.canvasWrap?.contains(target)) return;
			if (target.closest('.subject-list-panel, .menu-popup, button, a, input, select, [role="button"]')) return;
			this.selectedSlotIndex = null;
			this.updateHighlight();
			this.emitShownPeriod();
		},

		/** The default view: the chart of the next 24 hours, the reviews available now. */
		resetView() {
			this.closePicker();
			this.selectedSlotIndex = null;
			this.view = 'chart';
			this.mode = 'next24h';
			this.updateHighlight();
			this.$emit('reset');
		},

		/** Opened on a day (Home's calendar): that day's chart, and its reviews in the list. */
		openInitialDate() {
			const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(this.initialDate);
			if (!match) return;
			const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
			if (day < this.minDay || day > this.maxDay) return;
			this.selectedDay = day;
			this.mode = 'day';
			this.emitShownPeriod();
		},

		shiftView(delta) {
			this.selectedSlotIndex = null;
			this.moveView(delta);
			this.emitShownPeriod();
		},
		moveView(delta) {
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
	margin: 10px 4px 0;
	text-align: center;
	color: var(--font-sec-color);
}

/* the switch centred, "Now" at the right */
.reviews-chart-top {
	position: relative;
	margin-bottom: 8px;
}

.reviews-chart-now {
	position: absolute;
	right: 4px;
	top: 50%;
	transform: translateY(-50%);
	height: 24px;
	padding: 0 10px;
	border: 1px solid var(--surface-border-color);
	border-radius: 6px;
	background: var(--fill-color);
	color: var(--heading-color, #2a2d48);
	font-family: inherit;
	font-size: 11.5px;
	font-weight: 700;
	cursor: pointer;
}

.reviews-chart-now:hover {
	filter: brightness(0.96);
}

/* keeps its room when not needed */
.reviews-chart-now.hidden {
	visibility: hidden;
}

/* Chart / Month switch (same look as the other segmented controls) */
.reviews-chart-views {
	display: flex;
	width: fit-content;
	gap: 2px;
	margin: 0 auto;
	padding: 2px;
	border-radius: 8px;
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
}

.reviews-chart-views button {
	border: none;
	background: transparent;
	color: var(--tab-inactive-color);
	font-family: inherit;
	font-size: 11.5px;
	font-weight: 700;
	padding: 4px 14px;
	border-radius: 6px;
	cursor: pointer;
}

.reviews-chart-views button.active {
	background: var(--pill-color, #e36f94);
	color: #fff;
}

/* ---------- month calendar ---------- */

.reviews-month {
	padding: 0 4px;
}

.reviews-month-weekdays,
.reviews-month-grid {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	gap: 4px;
}

.reviews-month-weekdays {
	margin-bottom: 4px;
	font-size: 10.5px;
	font-weight: 700;
	text-align: center;
	color: var(--font-sec-color);
}

.reviews-month-day {
	position: relative;
	height: 42px;
	padding: 3px 4px;
	border: 1px solid var(--surface-border-color);
	border-radius: 7px;
	background: var(--fill-color);
	font-family: inherit;
	color: var(--font-color);
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	justify-content: space-between;
	cursor: pointer;
	transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.reviews-month-day:not(:disabled):hover {
	transform: translateY(-1px);
	box-shadow: 0 2px 6px var(--shadow-soft-color);
}

.reviews-month-day:disabled {
	cursor: default;
}

.reviews-month-day.blank {
	border: none;
	background: transparent;
}

.reviews-month-day.past {
	opacity: 0.4;
}

.reviews-month-day.today {
	outline: 2px solid var(--heading-color, #2a2d48);
	outline-offset: 1px;
}

.reviews-month-date {
	font-size: 10.5px;
	font-weight: 700;
	color: var(--font-sec-color);
}

.reviews-month-count {
	align-self: flex-end;
	font-size: 14px;
	font-weight: 800;
	line-height: 1;
}

/* busier days: white text on the darker blue */
.reviews-month-day.level-3 .reviews-month-count,
.reviews-month-day.level-4 .reviews-month-count,
.reviews-month-day.level-3 .reviews-month-date,
.reviews-month-day.level-4 .reviews-month-date {
	color: #fff;
}

/* the fastest possible level up: a pink ring and ▲ (inside, so it doesn't clash with today's outline) */
.reviews-month-day.level-up,
.reviews-picker-day.level-up {
	box-shadow: inset 0 0 0 2px var(--wanikani, #f100a1);
}

.reviews-levelup-mark {
	color: var(--wanikani, #f100a1);
	font-size: 9px;
	line-height: 1;
}

.reviews-month-day .reviews-levelup-mark {
	position: absolute;
	top: 4px;
	right: 5px;
}

.reviews-month-levelup {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 8px 0 0;
	font-size: 11px;
	font-weight: 700;
	color: var(--heading-color, #2a2d48);
}

.reviews-month-info {
	margin-left: 4px;
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

.reviews-chart-day-picker {
	position: relative;
}

.reviews-picker-toggle {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 5px 8px 5px 10px;
	border: 1px solid var(--surface-border-color);
	border-radius: 6px;
	background: var(--fill-color);
	color: var(--font-color);
	font-family: inherit;
	font-size: 12px;
	cursor: pointer;
}

.reviews-picker-toggle svg {
	width: 14px;
	height: 14px;
	fill: none;
	stroke: var(--font-sec-color);
	stroke-width: 2.5;
	stroke-linecap: round;
	stroke-linejoin: round;
}

/* the calendar opens above the toggle (it sits at the bottom of the box) */
.reviews-picker {
	position: absolute;
	right: 0;
	bottom: calc(100% + 6px);
	z-index: 30;
	width: 236px;
	padding: 10px;
	border: 1px solid var(--surface-border-color);
	border-radius: 10px;
	background: var(--fill-color);
	box-shadow: 0 8px 24px var(--shadow-soft-color);
}

.reviews-picker-nav {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 6px;
	font-size: 12.5px;
	font-weight: 700;
	color: var(--heading-color, #2a2d48);
}

.reviews-picker-nav button {
	width: 24px;
	height: 24px;
	border: none;
	border-radius: 6px;
	background: var(--surface-muted-color);
	color: var(--heading-color, #2a2d48);
	font-size: 15px;
	line-height: 1;
	cursor: pointer;
}

.reviews-picker-nav button:disabled {
	opacity: 0.35;
	cursor: default;
}

.reviews-picker-grid {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	gap: 3px;
}

.reviews-picker-day {
	height: 26px;
	border: none;
	border-radius: 6px;
	background: color-mix(in srgb, var(--reviews-color, #00aaff) 18%, var(--fill-color));
	color: var(--heading-color, #2a2d48);
	font-family: inherit;
	font-size: 11.5px;
	font-weight: 700;
	cursor: pointer;
}

.reviews-picker-day:not(:disabled):hover {
	background: color-mix(in srgb, var(--reviews-color, #00aaff) 40%, var(--fill-color));
}

/* no reviews that day (or out of range): grayed out */
.reviews-picker-day.empty {
	background: transparent;
	color: var(--font-sec-color);
	font-weight: 400;
	opacity: 0.45;
	cursor: default;
}

.reviews-picker-day.blank {
	background: transparent;
	cursor: default;
}

.reviews-picker-day.today {
	outline: 1.5px solid var(--heading-color, #2a2d48);
	outline-offset: -1.5px;
}

.reviews-picker-day.selected {
	background: var(--reviews-color, #00aaff);
	color: #fff;
}

/* the level-up day stays readable even with no reviews (otherwise faded out) */
.reviews-picker-day.empty.level-up {
	opacity: 1;
	color: var(--wanikani, #f100a1);
	font-weight: 700;
}
</style>
