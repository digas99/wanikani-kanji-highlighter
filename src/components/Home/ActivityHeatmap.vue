<template>
	<div class="activity">
		<!-- what to show: in the card's title row when it gives a place (Home), else here -->
		<Teleport :to="viewsTarget || 'body'" :disabled="!viewsTarget" defer>
			<div class="activity-views" role="radiogroup" aria-label="What to show">
				<button
					v-for="option in views"
					:key="option.key"
					type="button"
					role="radio"
					:aria-checked="view === option.key"
					:class="{ active: view === option.key }"
					@click="setView(option.key)"
				>{{ option.label }}</button>
			</div>
		</Teleport>

		<!-- one row: the period (the arrows never move: a fixed-width label between them), and its scale -->
		<div class="activity-toolbar">
			<div class="activity-period">
				<div class="activity-period-nav">
					<button type="button" :disabled="!canGoBack" title="Earlier" @click="shift(-1)">‹</button>
					<span class="activity-period-label">{{ periodLabel }}</span>
					<button type="button" :disabled="offset >= maxOffset" title="Later" @click="shift(1)">›</button>
				</div>
				<button
					type="button"
					class="activity-period-today"
					:class="{ hidden: offset === 0 }"
					:tabindex="offset === 0 ? -1 : 0"
					title="Back to now"
					@click="offset = 0"
				>Today</button>
			</div>
			<div class="activity-views" role="radiogroup" aria-label="Period">
				<button
					v-for="option in SCALES"
					:key="option.key"
					type="button"
					role="radio"
					:aria-checked="scale === option.key"
					:class="{ active: scale === option.key }"
					@click="setScale(option.key)"
				>{{ option.label }}</button>
			</div>
			<!-- what it shows (and doesn't): on hover / click; beside the card's title when it gives a place (Home) -->
			<Teleport :to="infoTarget || 'body'" :disabled="!infoTarget" defer>
				<InfoTip class="activity-info" label="About this calendar">
					<p>
						Only shows the days subjects were started, passed (Guru) or burned, not every review:
						the WaniKani API doesn't share your full review history.
					</p>
					<p v-if="futureShown">
						Ahead: each subject's next review (the ones after depend on your answers), and projections
						{{ paceLabel }} (Levels page).
					</p>
				</InfoTip>
			</Teleport>
		</div>

		<!-- a month: a big calendar, each day with its numbers -->
		<div v-if="scale === 'month'" class="activity-big-month">
			<span v-for="weekday in weekdays" :key="weekday" class="activity-weekday">{{ weekday }}</span>
			<div
				v-for="day in months[0].days"
				:key="day.key"
				class="activity-big-day"
				:class="[`level-${day.level}`, { active: day.value > 0, blank: day.blank, future: day.future, today: day.key === todayKey, 'level-up': day.mark === 'level-up', predicted: isPredicted(day), fast: isFast(day) && !isPredicted(day), link: isLink(day), target: hasTarget(day), reset: day.mark === 'reset', 'on-fill': day.level >= 3 && (!dotsShown || day.future) }]"
				:style="dayStyle(day)"
				:title="dayTooltip(day)"
				@click="onDayClick(day, $event)"
			>
				<template v-if="!day.blank">
					<span class="activity-big-date">{{ day.date }}</span>
					<!-- ahead: the reviews due that day -->
					<span v-if="day.future" class="activity-big-value reviews">{{ day.reviews || '' }}</span>
					<span v-else-if="day.entry && view === 'all'" class="activity-big-counts">
						<span v-for="part in ALL_PARTS" v-show="day.entry[part.key]" :key="part.key" :title="`${day.entry[part.key]} ${part.key}`">
							<span class="activity-big-dot" :style="{ background: part.color }"></span>{{ day.entry[part.key] }}
						</span>
					</span>
					<span v-else-if="day.value" class="activity-big-value">
						<svg v-if="view === 'burned'" viewBox="3 1 18 22" aria-hidden="true">
							<path fill-rule="evenodd" d="M19.48 12.35c-1.57-4.08-7.16-4.3-5.81-10.23.1-.44-.37-.78-.75-.55C9.29 3.71 6.68 8 8.87 13.62c.18.46-.36.89-.75.59-1.81-1.37-2-3.34-1.84-4.75.06-.52-.62-.77-.91-.34C4.69 10.16 4 11.84 4 14.37c.38 5.6 5.11 7.32 6.81 7.54 2.43.31 5.06-.14 6.95-1.87 2.08-1.93 2.84-5.01 1.72-7.69zm-9.28 5.03c1.44-.35 2.18-1.39 2.38-2.31.33-1.43-.96-2.83-.09-5.09.33 1.87 3.27 3.04 3.27 5.08.08 2.53-2.66 4.7-5.56 2.32z" />
						</svg>
						{{ day.value }}
					</span>
					<span v-if="day.mark === 'reset'" class="activity-big-tag reset">Reset</span>
					<span v-else-if="day.mark === 'level-up' && levelNumber(day)" class="activity-big-tag">Lv {{ levelNumber(day) }}</span>
					<!-- projected: level ups, JLPT / Jōyō / level 60 -->
					<span
						v-for="tag in projectedTags(day)"
						:key="tag.key"
						class="activity-big-tag"
						:class="tag.classes"
					>{{ tag.label }}</span>
				</template>
			</div>
		</div>

		<!-- a year as 12 small month calendars (a single 53-week strip is too narrow here) -->
		<div v-else class="activity-year">
			<!-- a month opens it in the month view -->
			<div
				v-for="(month, index) in months"
				:key="month.key"
				class="activity-month"
				role="button"
				tabindex="0"
				:title="`${monthStarts[index].toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}: show the month`"
				@click="openMonth(monthStarts[index])"
				@keydown.enter="openMonth(monthStarts[index])"
			>
				<span class="activity-month-label">{{ month.label }}</span>
				<div class="activity-month-grid">
					<span
						v-for="day in month.days"
						:key="day.key"
						class="activity-day"
						:class="[`level-${day.level}`, { active: day.value > 0, blank: day.blank, future: day.future, today: day.key === todayKey, flame: view === 'burned' && day.level > 0 && !day.future, 'level-up': day.mark === 'level-up', predicted: isPredicted(day), fast: isFast(day) && !isPredicted(day), link: isLink(day), reset: day.mark === 'reset' }]"
						:style="dayStyle(day)"
						:title="dayTooltip(day)"
						@click="onDayClick(day, $event)"
					>
						<!-- a level up: the level reached, over any shading -->
						<span v-if="levelNumber(day)" class="activity-day-level" :class="{ 'on-fill': day.level >= 2 }" aria-hidden="true">{{ levelNumber(day) }}</span>
						<!-- burned: a flame on the day -->
						<svg v-else-if="view === 'burned' && day.level > 0 && !day.future" viewBox="3 1 18 22" aria-hidden="true">
							<path fill-rule="evenodd" d="M19.48 12.35c-1.57-4.08-7.16-4.3-5.81-10.23.1-.44-.37-.78-.75-.55C9.29 3.71 6.68 8 8.87 13.62c.18.46-.36.89-.75.59-1.81-1.37-2-3.34-1.84-4.75.06-.52-.62-.77-.91-.34C4.69 10.16 4 11.84 4 14.37c.38 5.6 5.11 7.32 6.81 7.54 2.43.31 5.06-.14 6.95-1.87 2.08-1.93 2.84-5.01 1.72-7.69zm-9.28 5.03c1.44-.35 2.18-1.39 2.38-2.31.33-1.43-.96-2.83-.09-5.09.33 1.87 3.27 3.04 3.27 5.08.08 2.53-2.66 4.7-5.56 2.32z" />
						</svg>
					</span>
				</div>
			</div>
		</div>

		<div class="activity-footer">
			<span class="activity-total">{{ totalLabel }}</span>
			<span class="activity-legend" aria-hidden="true">
				Less
				<span v-for="level in 4" :key="level" class="swatch" :style="dayStyle({ level })"></span>
				More
			</span>
		</div>

		<!-- rings: level ups and resets (from the level history, so also before a reset) -->
		<p v-if="marksShown.levelUp || marksShown.reset || levelUpShown || dotsShown || futureShown" class="activity-marks">
			<!-- month, All: what each dot is -->
			<template v-if="dotsShown">
				<span v-for="part in ALL_PARTS" :key="part.key" class="activity-mark">
					<span class="activity-big-dot" :style="{ background: part.color }" aria-hidden="true"></span>
					{{ part.key.charAt(0).toUpperCase() + part.key.slice(1) }}
				</span>
			</template>
			<span v-if="marksShown.levelUp" class="activity-mark">
				<span class="activity-mark-swatch level-up" aria-hidden="true"></span>
				Level up
			</span>
			<span v-if="marksShown.reset" class="activity-mark">
				<span class="activity-mark-swatch reset" aria-hidden="true"></span>
				Reset
			</span>
			<span v-if="levelUpShown" class="activity-mark">
				<span class="activity-mark-swatch fast" aria-hidden="true"></span>
				{{ levelUp.label }}
			</span>
			<!-- ahead: reviews due, projected level ups and targets -->
			<template v-if="futureShown">
				<span class="activity-mark">
					<span class="activity-mark-swatch reviews" aria-hidden="true"></span>
					Reviews due
				</span>
				<span v-if="marksShown.paceLevel" class="activity-mark">
					<span class="activity-mark-swatch predicted" aria-hidden="true"></span>
					Level up, your pace
				</span>
				<span v-if="marksShown.fastLevel" class="activity-mark">
					<span class="activity-mark-swatch fast" aria-hidden="true"></span>
					Level up, fastest
				</span>
				<span v-if="marksShown.target" class="activity-mark" title="In the month view: filled at your pace, outlined at the fastest">
					<span class="activity-mark-swatch target" aria-hidden="true"></span>
					JLPT / Jōyō / level 60
				</span>
			</template>
		</p>

	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import { projectionEvents, recentPaceDays } from '@/utils/scripts/projections';
import InfoTip from '@/components/InfoTip.vue';

const VIEW_KEY = 'homeActivityView';

const VIEWS = [
	{ key: 'burned', label: 'Burned', color: '#e20000', noun: 'burned' },
	{ key: 'started', label: 'Started', color: '#dd0093', noun: 'started' },
	{ key: 'passed', label: 'Passed', color: '#882d9e', noun: 'passed' },
	{ key: 'all', label: 'All', color: '#00aaff', noun: 'subjects' },
];

const SCALE_KEY = 'homeActivityScale';

const SCALES = [
	{ key: 'year', label: 'Year' },
	{ key: 'month', label: 'Month' },
];

/** The "All" view's counts in the month calendar, each with its view's colour. */
const ALL_PARTS = ['started', 'passed', 'burned'].map(key => ({ key, color: VIEWS.find(view => view.key === key).color }));

function readSavedScale() {
	try {
		return localStorage.getItem(SCALE_KEY) === 'month' ? 'month' : 'year';
	} catch {
		return 'year';
	}
}

function readSavedView() {
	try {
		const saved = localStorage.getItem(VIEW_KEY);
		return VIEWS.some(view => view.key === saved) ? saved : 'burned';
	} catch {
		return 'burned';
	}
}

/** Local calendar day, as a sortable key. */
function dayKey(date) {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

function startOfDay(date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const shortYear = year => `'${String(year).slice(-2)}`;

const HOUR = 60 * 60 * 1000;

/**
 * Level ups and resets from the level progressions (abandoned ones included: they're the
 * levels before a reset). day key → { levelUps: [{ level, beforeReset }], resets: [{ from, to }] }
 */
function buildMilestones(levelsStats) {
	const byDay = new Map();
	if (!levelsStats) return byDay;
	const dayOf = time => {
		const key = dayKey(new Date(time));
		if (!byDay.has(key)) byDay.set(key, { levelUps: [], resets: [] });
		return byDay.get(key);
	};
	const entries = Object.entries(levelsStats).flatMap(([level, list]) =>
		(list ?? []).map(entry => ({ ...entry, level: Number(entry.level ?? level) })));

	const unlocks = entries
		.map(entry => ({ level: entry.level, time: Date.parse(entry.unlocked_at ?? '') }))
		.filter(entry => !Number.isNaN(entry.time));

	// a reset marks the level you were on abandoned; the one you go back to unlocks at that moment
	const resets = [];
	for (const entry of entries) {
		const time = Date.parse(entry.abandoned_at ?? '');
		if (Number.isNaN(time) || resets.some(reset => Math.abs(reset.time - time) < HOUR)) continue;
		const restart = unlocks
			.filter(unlock => Math.abs(unlock.time - time) < HOUR && unlock.level <= entry.level)
			.sort((a, b) => a.level - b.level)[0];
		resets.push({ time, from: entry.level, to: restart?.level ?? null, restart });
	}
	for (const reset of resets) dayOf(reset.time).resets.push({ from: reset.from, to: reset.to });

	// a level up: a level unlocked (not level 1, nor the level a reset sent you back to)
	for (const unlock of unlocks) {
		if (unlock.level < 2 || resets.some(reset => reset.restart === unlock)) continue;
		const beforeReset = resets.some(reset => reset.time > unlock.time);
		dayOf(unlock.time).levelUps.push({ level: unlock.level, beforeReset });
	}
	for (const day of byDay.values()) day.levelUps.sort((a, b) => a.level - b.level);
	return byDay;
}

export default {
	name: 'ActivityHeatmap',

	components: { InfoTip },

	props: {
		/** The user's assignments (started_at / passed_at / burned_at). */
		assignments: { type: Array, default: () => [] },
		/** where the "what to show" switch goes (a selector: the card's title row); none: above the calendar */
		viewsTarget: { type: String, default: null },
		/** where the ⓘ goes (Home: beside the card's title), else in the period row */
		infoTarget: { type: String, default: null },
	},

	data() {
		return {
			view: readSavedView(),
			/** 'year' (12 small months) or 'month' (one big one) */
			scale: readSavedScale(),
			/**
			 * Year: 0 = the last 12 months; -1 = last calendar year, -2 = the year before…;
			 * 1 = this calendar year (the rest of it ahead), 2 = next year…
			 * Month: 0 = this month, -1 = last month, 1 = next month…
			 */
			offset: 0,
			SCALES,
			ALL_PARTS,
		};
	},

	computed: {
		views() {
			return VIEWS;
		},
		/** Sunday first, as the calendars */
		weekdays() {
			const sunday = new Date(2024, 0, 7);
			return Array.from({ length: 7 }, (_, i) =>
				new Date(2024, 0, sunday.getDate() + i).toLocaleDateString(undefined, { weekday: 'short' }));
		},
		/** The current level's fastest possible level up: outlined when it's in the shown months. */
		levelUp() {
			const fastest = useWKStore().fastestLevelUp;
			if (!fastest) return null;
			const at = new Date(Math.max(fastest.at, Date.now()));
			const when = at.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
			return { key: dayKey(at), level: fastest.level + 1, label: `Fastest possible level up to ${fastest.level + 1}: ${when}` };
		},
		levelUpShown() {
			const key = this.levelUp?.key;
			return Boolean(key && this.months.some(month => month.days.some(day => day.key === key)));
		},
		viewConfig() {
			return VIEWS.find(view => view.key === this.view);
		},
		/** day key → { started, passed, burned } over the whole history. */
		countsByDay() {
			const counts = new Map();
			const add = (iso, field) => {
				if (!iso) return;
				const date = new Date(iso);
				if (Number.isNaN(date.getTime())) return;
				const key = dayKey(date);
				const entry = counts.get(key) ?? { started: 0, passed: 0, burned: 0 };
				entry[field] += 1;
				counts.set(key, entry);
			};
			for (const assignment of this.assignments) {
				add(assignment.started_at, 'started');
				add(assignment.passed_at, 'passed');
				add(assignment.burned_at, 'burned');
			}
			return counts;
		},
		dotsShown() {
			// a month all ahead has no activity to dot
			return this.scale === 'month' && this.view === 'all' && this.monthStarts[0] <= this.today;
		},
		milestonesByDay() {
			return buildMilestones(useWKStore().levelsStats);
		},
		/** Which ring kinds the shown months have (for the legend). */
		marksShown() {
			const shown = { levelUp: false, reset: false, paceLevel: false, fastLevel: false, target: false };
			for (const month of this.months) {
				for (const day of month.days) {
					if (day.mark === 'level-up') shown.levelUp = true;
					if (day.mark === 'reset') shown.reset = true;
					for (const event of day.projections ?? []) {
						// JLPT / Jōyō / level 60: in the month view only
						if (event.kind === 'target') shown.target = shown.target || this.scale === 'month';
						else if (event.pace === 'fastest') shown.fastLevel = true;
						else shown.paceLevel = true;
					}
				}
			}
			return shown;
		},
		/** Ahead: day key → reviews due (each subject's next review only). */
		reviewsByDay() {
			const counts = new Map();
			const now = Date.now();
			for (const assignment of this.assignments) {
				if (assignment.hidden || !(assignment.srs_stage > 0) || !assignment.available_at) continue;
				const at = Date.parse(assignment.available_at);
				if (!(at > now)) continue;
				const key = dayKey(new Date(at));
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
			return counts;
		},
		/** your pace: days a level (null: no passed level yet, only the fastest is shown) */
		yourPaceDays() {
			return recentPaceDays(useWKStore().levelsStats);
		},
		/**
		 * Ahead: day key → projected level ups and targets at your pace (projections.ts); the
		 * fastest pace only without a passed level to take your pace from.
		 */
		projectionsByDay() {
			const wk = useWKStore();
			const byDay = new Map();
			const paces = this.yourPaceDays ? ['yours'] : ['fastest'];
			const events = paces.flatMap(pace => projectionEvents({
				subjects: wk.allSubjects,
				complete: wk.allSubjectsInMemory,
				levelsStats: wk.levelsStats,
				currentLevel: wk.userInfo?.level,
				fastestLevelUp: wk.fastestLevelUp,
				pace,
			}));
			for (const event of events) {
				const key = dayKey(new Date(event.time));
				if (!byDay.has(key)) byDay.set(key, []);
				byDay.get(key).push(event);
			}
			return byDay;
		},
		paceLabel() {
			const days = this.yourPaceDays;
			if (!days) return 'at the fastest pace';
			return `at your pace (${days.toFixed(days < 10 ? 1 : 0)} days a level)`;
		},
		/** The last day with something ahead (reviews, projections). */
		lastFutureKey() {
			let last = this.todayKey;
			for (const key of this.reviewsByDay.keys()) if (key > last) last = key;
			for (const key of this.projectionsByDay.keys()) if (key > last) last = key;
			return last;
		},
		/** How far "Later" goes: to the last day with something ahead. */
		maxOffset() {
			const [year, month] = this.lastFutureKey.split('-').map(Number);
			const now = this.today;
			const monthsAhead = (year - now.getFullYear()) * 12 + (month - 1) - now.getMonth();
			if (this.scale === 'month') return Math.max(0, monthsAhead);
			// the rolling view ends this month: anything later starts at this calendar year
			return monthsAhead > 0 ? year - now.getFullYear() + 1 : 0;
		},
		/** The shown months have days ahead with something on them. */
		futureShown() {
			return this.months.some(month => month.days.some(day => day.future && (day.reviews || day.projections?.length)));
		},
		/** Back as far as the activity, or the level history (it outlasts resets). */
		firstActivityKey() {
			let first = null;
			for (const key of this.countsByDay.keys()) if (!first || key < first) first = key;
			for (const key of this.milestonesByDay.keys()) if (!first || key < first) first = key;
			return first;
		},
		firstActivityYear() {
			return this.firstActivityKey ? Number(this.firstActivityKey.slice(0, 4)) : null;
		},
		today() {
			return startOfDay(new Date());
		},
		todayKey() {
			return dayKey(this.today);
		},
		/** The calendar year shown (offset ≠ 0): back, or this year and on. */
		year() {
			return this.today.getFullYear() + (this.offset > 0 ? this.offset - 1 : this.offset);
		},
		/** First day of each month shown: the last 12 months, or January → December. */
		monthStarts() {
			if (this.scale === 'month') {
				return [new Date(this.today.getFullYear(), this.today.getMonth() + this.offset, 1)];
			}
			if (this.offset === 0) {
				return Array.from({ length: 12 }, (_, i) =>
					new Date(this.today.getFullYear(), this.today.getMonth() - 11 + i, 1));
			}
			return Array.from({ length: 12 }, (_, i) => new Date(this.year, i, 1));
		},
		canGoBack() {
			if (this.offset > 0) return true;
			if (!this.firstActivityYear) return false;
			if (this.scale === 'month') return dayKey(this.monthStarts[0]).slice(0, 7) > this.firstActivityKey.slice(0, 7);
			const earliestShown = this.offset === 0 ? this.monthStarts[0].getFullYear() : this.year;
			// the rolling view starts mid-year: going back shows the whole of last year
			return this.offset === 0 ? this.year - 1 >= this.firstActivityYear : earliestShown > this.firstActivityYear;
		},
		periodLabel() {
			if (this.scale === 'month') {
				return this.monthStarts[0].toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
			}
			if (this.offset !== 0) return String(this.year);
			const first = this.monthStarts[0];
			const last = this.monthStarts[11];
			const month = date => date.toLocaleDateString(undefined, { month: 'short' });
			return `${month(first)} ${shortYear(first.getFullYear())} – ${month(last)} ${shortYear(last.getFullYear())}`;
		},
		/** Count for the selected view on a day. */
		valueOf() {
			return entry => {
				if (!entry) return 0;
				if (this.view === 'all') return entry.started + entry.passed + entry.burned;
				return entry[this.view];
			};
		},
		periodMax() {
			let max = 0;
			for (const start of this.monthStarts) {
				const cursor = new Date(start);
				while (cursor.getMonth() === start.getMonth()) {
					max = Math.max(max, this.valueOf(this.countsByDay.get(dayKey(cursor))));
					cursor.setDate(cursor.getDate() + 1);
				}
			}
			return max;
		},
		/** The busiest day ahead in the shown months (reviews due). */
		futureMax() {
			let max = 0;
			for (const start of this.monthStarts) {
				const cursor = new Date(start);
				while (cursor.getMonth() === start.getMonth()) {
					if (cursor > this.today) max = Math.max(max, this.reviewsByDay.get(dayKey(cursor)) ?? 0);
					cursor.setDate(cursor.getDate() + 1);
				}
			}
			return max;
		},
		/** Each month as a calendar: weeks in rows, Sunday → Saturday, blanks before the 1st. */
		months() {
			const crossesYears = this.scale === 'year' && this.offset === 0
				&& this.monthStarts[0].getFullYear() !== this.monthStarts[11].getFullYear();
			return this.monthStarts.map((start, index) => {
				const days = [];
				for (let blank = 0; blank < start.getDay(); blank += 1) {
					days.push({ key: `b${blank}`, blank: true, level: 0, value: 0 });
				}
				const cursor = new Date(start);
				while (cursor.getMonth() === start.getMonth()) {
					const key = dayKey(cursor);
					const entry = this.countsByDay.get(key);
					const value = this.valueOf(entry);
					const future = cursor > this.today;
					const milestone = future ? null : this.milestonesByDay.get(key);
					let mark = null;
					if (milestone?.resets.length) mark = 'reset';
					else if (milestone?.levelUps.length) mark = 'level-up';
					// ahead: the reviews due, and what's projected
					const reviews = future ? this.reviewsByDay.get(key) ?? 0 : 0;
					const projections = future ? this.projectionsByDay.get(key) ?? [] : [];
					days.push({
						key,
						date: cursor.getDate(),
						entry: future ? null : entry,
						value: future ? 0 : value,
						future,
						mark,
						reviews,
						projections,
						level: future ? this.futureLevelFor(reviews) : this.levelFor(value),
						title: future ? this.futureTitle(cursor, reviews, projections) : this.dayTitle(cursor, entry, milestone),
					});
					cursor.setDate(cursor.getDate() + 1);
				}
				const name = start.toLocaleDateString(undefined, { month: 'short' });
				// rolling view: mark where a new year starts
				const label = crossesYears && (index === 0 || start.getMonth() === 0)
					? `${name} ${shortYear(start.getFullYear())}`
					: name;
				return { key: dayKey(start), label, days };
			});
		},
		totalLabel() {
			let total = 0;
			for (const month of this.months) for (const day of month.days) total += day.value;
			let reviews = 0;
			for (const month of this.months) for (const day of month.days) reviews += day.reviews ?? 0;
			const due = `${reviews} ${reviews === 1 ? 'review' : 'reviews'} due`;
			let where = this.offset === 0 ? 'in the last 12 months' : `in ${this.year}`;
			if (this.scale === 'month') where = this.offset === 0 ? 'this month' : `in ${this.periodLabel}`;
			// all ahead: only what's due
			if (this.monthStarts[0] > this.today) return `${due} ${where}`;
			const done = this.view === 'all'
				? `${total} started, passed or burned ${where}`
				: `${total} ${total === 1 ? 'subject' : 'subjects'} ${this.viewConfig.noun} ${where}`;
			return reviews ? `${done} · ${due}` : done;
		},
	},

	mounted() {
		// the calendar marks the day of the fastest possible level up
		void useWKStore().refreshFastestLevelUp();
	},

	methods: {
		setView(key) {
			this.view = key;
			try {
				localStorage.setItem(VIEW_KEY, key);
			} catch {
				// remembering the view is optional
			}
		},
		shift(direction) {
			this.offset = Math.min(this.maxOffset, this.offset + direction);
		},
		/**
		 * A day with activity: its subjects (all of them), scrolled to the view's part. In the year
		 * view the click stays on the day (the month around it would zoom in).
		 */
		openDay(day, event) {
			event?.stopPropagation();
			const query = { date: day.key };
			if (this.view !== 'all') query.jump = this.view;
			this.$router.push({ name: 'Day', query });
		},
		/**
		 * A day with activity: its subjects. Ahead: a projected level up (or target) opens the
		 * projections, reviews due the Reviews page on that day. Both on a day: the month view's
		 * tags are the projections, the rest of the day its reviews; a year view's (tiny) day, the
		 * projections.
		 */
		onDayClick(day, event) {
			if (day.value) {
				this.openDay(day, event);
				return;
			}
			if (!this.isLink(day)) return;
			// in the year view, the month around it would zoom in
			event?.stopPropagation();
			const onTag = Boolean(event?.target?.closest?.('.activity-big-tag'));
			const toProjections = this.isProjected(day) && (onTag || this.scale === 'year' || !day.reviews);
			if (toProjections) this.$router.push({ name: 'Levels', query: { focus: 'projections' } });
			else this.$router.push({ name: 'Reviews', query: { date: day.key } });
		},
		/** Ahead, a projected level up or target (or the fastest possible next level up). */
		isProjected(day) {
			return !day.blank && (this.isFast(day) || Boolean(day.projections?.length));
		},
		/** Ahead, something to open: the projections, or the day's reviews. */
		isLink(day) {
			return this.isProjected(day) || Boolean(day.future && day.reviews);
		},
		/** The year view's month, zoomed in. */
		openMonth(start) {
			const now = this.today;
			this.setScale('month');
			this.offset = (start.getFullYear() - now.getFullYear()) * 12 + start.getMonth() - now.getMonth();
		},
		/** Switching keeps roughly the same time: a month → its year; a past year → its December. */
		setScale(scale) {
			if (scale === this.scale) return;
			const now = this.today;
			if (scale === 'year') {
				const shown = this.monthStarts[0];
				// within the last 12 months: the rolling view; ahead: its calendar year
				const monthsAgo = (now.getFullYear() - shown.getFullYear()) * 12 + now.getMonth() - shown.getMonth();
				if (monthsAgo < 0) this.offset = shown.getFullYear() - now.getFullYear() + 1;
				else this.offset = monthsAgo < 12 ? 0 : shown.getFullYear() - now.getFullYear();
			} else if (this.offset > 0) {
				// a year ahead: its first month still ahead (this year: next month)
				const month = this.year === now.getFullYear() ? now.getMonth() + 1 : 0;
				this.offset = (this.year - now.getFullYear()) * 12 + month - now.getMonth();
			} else {
				this.offset = this.offset === 0 ? 0 : (this.year - now.getFullYear()) * 12 + 11 - now.getMonth();
			}
			this.scale = scale;
			try {
				localStorage.setItem(SCALE_KEY, scale);
			} catch {
				// remembering the scale is optional
			}
		},
		/** The level reached on a level-up day (the highest, if several), or the predicted one. */
		levelNumber(day) {
			if (day.blank) return null;
			if (this.levelUp && day.key === this.levelUp.key) return this.levelUp.level;
			// your pace's first (the one ringed), else the fastest's
			const projected = (day.projections ?? []).filter(event => event.kind === 'level')
				.sort((a, b) => Number(a.pace === 'fastest') - Number(b.pace === 'fastest'));
			if (projected.length) return projected[0].level;
			if (day.mark !== 'level-up') return null;
			const ups = this.milestonesByDay.get(day.key)?.levelUps ?? [];
			return ups.length ? ups[ups.length - 1].level : null;
		},
		/** 0 = nothing, 1–4 = quarters of the period's busiest day. */
		levelFor(value) {
			if (!value || !this.periodMax) return 0;
			return Math.min(4, Math.ceil((value / this.periodMax) * 4));
		},
		/** Ahead, the same by reviews due. */
		futureLevelFor(reviews) {
			if (!reviews || !this.futureMax) return 0;
			return Math.min(4, Math.ceil((reviews / this.futureMax) * 4));
		},
		/** A level up projected at your pace (a dotted gold ring). */
		isPredicted(day) {
			return Boolean(day.projections?.some(event => event.kind === 'level' && event.pace === 'yours'));
		},
		/** The fastest possible next level up, or a later one at the fastest pace (dotted green). */
		isFast(day) {
			return Boolean((this.levelUp && day.key === this.levelUp.key)
				|| day.projections?.some(event => event.kind === 'level' && event.pace === 'fastest'));
		},
		hasTarget(day) {
			return Boolean(day.projections?.some(event => event.kind === 'target'));
		},
		/**
		 * The month cell's projected tags: level ups (gold: your pace, green: the fastest), then
		 * JLPT / Jōyō / level 60 (filled: your pace, outlined: the fastest).
		 */
		projectedTags(day) {
			if (day.blank) return [];
			const tags = [];
			if (this.levelUp && day.key === this.levelUp.key) {
				tags.push({ key: 'next', label: `Lv ${this.levelUp.level}?`, classes: 'predicted fast' });
			}
			const events = [...(day.projections ?? [])].sort((a, b) => Number(a.kind === 'target') - Number(b.kind === 'target'));
			for (const event of events) {
				const fast = event.pace === 'fastest';
				tags.push(event.kind === 'level'
					? { key: `${event.pace}-${event.level}`, label: `Lv ${event.level}?`, classes: fast ? 'predicted fast' : 'predicted' }
					: { key: `${event.pace}-${event.label}`, label: event.label, classes: fast ? 'target fast' : 'target' });
			}
			return tags;
		},
		dayTooltip(day) {
			if (this.levelUp && day.key === this.levelUp.key) return [this.levelUp.label, day.title].filter(Boolean).join('\n');
			return day.title;
		},
		futureTitle(date, reviews, projections) {
			const label = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
			const lines = [`${label}: ${reviews ? `${reviews} ${reviews === 1 ? 'review' : 'reviews'} due` : 'no reviews due'}`];
			for (const event of projections) lines.push(event.title);
			if (projections.length && (this.scale === 'year' || !reviews)) lines.push('Click: see the projections');
			else if (reviews) lines.push(projections.length ? 'Click: see the reviews (a tag: the projections)' : 'Click: see the reviews');
			return lines.join('\n');
		},
		dayTitle(date, entry, milestone) {
			const date_ = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
			const label = dayKey(date) === this.todayKey ? `Today, ${date_}` : date_;
			let title;
			if (!entry) title = `${label}: nothing`;
			else if (this.view === 'all') title = `${label}\n${entry.started} started · ${entry.passed} passed · ${entry.burned} burned`;
			else title = `${label}: ${entry[this.view]} ${this.viewConfig.noun}`;
			const lines = [
				...(milestone?.levelUps ?? []).map(up =>
					`Level up: ${up.level - 1} → ${up.level}${up.beforeReset ? ' (before a reset)' : ''}`),
				...(milestone?.resets ?? []).map(reset =>
					(reset.to ? `Reset: level ${reset.from} → ${reset.to}` : `Reset from level ${reset.from}`)),
			];
			return lines.length ? `${title}\n${lines.join('\n')}` : title;
		},
		dayStyle(day) {
			if (day.blank || !day.level) return {};
			// ahead: the reviews due, in the reviews' blue (whatever the view)
			if (day.future) {
				const alpha = [0, 0.3, 0.5, 0.75, 1][day.level];
				return {
					backgroundColor: `color-mix(in srgb, var(--reviews-color, #00aaff) ${alpha * 100}%, transparent)`,
					// light stripes: a forecast, not activity (All's blue is the same colour)
					backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.4) 0 1.5px, transparent 1.5px 4px)',
				};
			}
			const color = this.viewConfig.color;
			const alpha = [0, 0.3, 0.5, 0.75, 1][day.level];
			// month, All: a border instead (a fill would wash out the coloured dots and numbers)
			if (this.dotsShown) {
				return { border: `2px solid color-mix(in srgb, ${color} ${alpha * 100}%, transparent)` };
			}
			const style = { backgroundColor: `color-mix(in srgb, ${color} ${alpha * 100}%, transparent)` };
			// burned: the shading plus a flame, bigger on busier days
			if (this.view === 'burned') style['--flame-scale'] = 0.6 + day.level * 0.1;
			return style;
		},
	},
};
</script>

<style scoped>
.activity {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

/* view buttons on the left, period on the right, one line */
.activity-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 6px;
	flex-wrap: nowrap;
}

/* same segmented control as the JLPT / Jōyō switch */
.activity-views {
	display: flex;
	gap: 2px;
	padding: 2px;
	border-radius: 8px;
	background: var(--surface-muted-color);
	border: 1px solid var(--surface-border-color);
}

.activity-views button {
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

.activity-views button.active {
	background: var(--pill-color, #e36f94);
	color: #fff;
}

/* the label centred, "Today" in the right column: neither moves the arrows */
.activity-period {
	display: flex;
	align-items: center;
	gap: 6px;
}

.activity-period-nav {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 11.5px;
	font-weight: 700;
	color: var(--font-sec-color);
	white-space: nowrap;
}

/* wide enough for the longest label ("September 2026", "Nov '25 – Oct '26") */
.activity-period-label {
	width: 124px;
	text-align: center;
}

/* as the arrows next to it */
.activity-period-today {
	justify-self: start;
	height: 22px;
	border: none;
	background: var(--surface-muted-color);
	color: var(--heading-color, #2a2d48);
	font-family: inherit;
	font-size: 11px;
	font-weight: 700;
	padding: 0 8px;
	border-radius: 6px;
	cursor: pointer;
}

.activity-period-today:hover {
	filter: brightness(0.96);
}

/* keeps its room when not needed */
.activity-period-today.hidden {
	visibility: hidden;
}

.activity-period-nav button {
	width: 22px;
	height: 22px;
	border: none;
	border-radius: 6px;
	background: var(--surface-muted-color);
	color: var(--heading-color, #2a2d48);
	font-size: 15px;
	line-height: 1;
	cursor: pointer;
}

.activity-period-nav button:disabled {
	opacity: 0.35;
	cursor: default;
}

/* one month, big: weekdays on top, a cell per day with its numbers */
.activity-big-month {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	gap: 4px;
}

.activity-weekday {
	font-size: 10px;
	font-weight: 800;
	text-align: center;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--font-sec-color);
}

.activity-big-day {
	position: relative;
	min-height: 52px;
	padding: 3px 4px;
	border-radius: 7px;
	background: var(--surface-muted-color);
	display: flex;
	flex-direction: column;
	gap: 1px;
	box-sizing: border-box;
	color: var(--heading-color, #2a2d48);
}

.activity-big-day.blank,
.activity-big-day.future {
	background: transparent;
}

.activity-big-day.future {
	box-shadow: inset 0 0 0 1px var(--surface-muted-color);
}

.activity-big-day.today {
	outline: 2px solid var(--heading-color, #2a2d48);
	outline-offset: 1px;
}

/* darker shades: white text */
.activity-big-day.on-fill {
	color: #fff;
}

.activity-big-date {
	font-size: 10px;
	font-weight: 700;
	opacity: 0.7;
	line-height: 1.1;
}

/* a view's count: big in the middle */
.activity-big-value {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 2px;
	font-size: 15px;
	font-weight: 800;
	font-variant-numeric: tabular-nums;
}

.activity-big-value svg {
	width: 10px;
	height: 12px;
	fill: currentColor;
}

/* All: started / passed / burned, a dot each */
.activity-big-counts {
	display: flex;
	flex-direction: column;
	gap: 0;
	font-size: 10px;
	font-weight: 800;
	line-height: 1.25;
	font-variant-numeric: tabular-nums;
}

.activity-big-counts > span {
	display: flex;
	align-items: center;
	gap: 3px;
}

/* a span: the global <i> style (icons) would take over an <i> */
.activity-big-dot {
	display: block;
	flex-shrink: 0;
	width: 6px;
	height: 6px;
	border-radius: 50%;
	box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.7);
}

/* level up / reset: a small tag at the bottom */
.activity-big-tag {
	align-self: flex-start;
	margin-top: auto;
	padding: 0 4px;
	border-radius: 999px;
	background: #f5a400;
	color: #fff;
	font-size: 9px;
	font-weight: 800;
	line-height: 13px;
	white-space: nowrap;
}

.activity-big-tag.reset {
	background: var(--heading-color, #2a2d48);
	color: var(--fill-color, #fff);
}

.activity-big-tag.predicted {
	background: transparent;
	color: #c98700;
	border: 1px dotted #f5a400;
}

/* projected JLPT / Jōyō / level 60: a violet tag (no view uses it) */
.activity-big-tag.target {
	margin-top: 1px;
	background: #7c5cff;
}

.activity-big-tag + .activity-big-tag.target {
	margin-top: 1px;
}

/* ahead: the reviews due, in the middle */
.activity-big-value.reviews {
	font-size: 13px;
}

/* the year view's rings, on the big cells too */
.activity-big-day.level-up {
	box-shadow: inset 0 0 0 2px #f5a400;
}

.activity-big-day.reset {
	box-shadow: inset 0 0 0 2px var(--heading-color, #2a2d48);
}

.activity-big-day.predicted {
	box-shadow: none;
	border: 1.5px dotted #f5a400;
}

.activity-big-day.target:not(.predicted) {
	box-shadow: inset 0 0 0 1.5px #7c5cff;
}

/* a day with activity: opens its subjects */
.activity-day.active,
.activity-big-day.active {
	cursor: pointer;
}

/* a projected level up: opens the projections (Levels page) */
.activity-day.link,
.activity-big-day.link {
	cursor: pointer;
}

.activity-big-day.link:hover {
	filter: brightness(0.95);
}

.activity-day.active,
.activity-day.link {
	transition: transform 0.12s ease;
}

.activity-day.link:hover,
.activity-day.active:hover {
	position: relative;
	z-index: 1;
	transform: scale(1.35);
}

.activity-big-day.active:hover {
	filter: brightness(0.95);
}

/* 12 months, 4 per row */
.activity-year {
	display: grid;
	grid-template-columns: repeat(4, auto);
	justify-content: space-between;
	row-gap: 10px;
}

.activity-month {
	display: flex;
	flex-direction: column;
	gap: 3px;
	/* room for the hover background without moving the grid */
	margin: -3px;
	padding: 3px;
	border-radius: 6px;
	cursor: pointer;
	transition: box-shadow 0.15s;
}

/* an outline (a background the colour of the empty days would hide them) */
.activity-month:hover,
.activity-month:focus-visible {
	box-shadow: 0 0 0 1.5px var(--surface-border-color), 0 2px 8px var(--shadow-soft-color);
	outline: none;
}

.activity-month:hover .activity-month-label {
	color: var(--heading-color, #2a2d48);
}

.activity-month-label {
	font-size: 10.5px;
	font-weight: 700;
	color: var(--font-sec-color);
}

.activity-month-grid {
	display: grid;
	grid-template-columns: repeat(7, 11px);
	grid-auto-rows: 11px;
	gap: 2px;
}

.activity-day {
	width: 11px;
	height: 11px;
	border-radius: 3px;
	background: var(--surface-muted-color);
	display: flex;
	align-items: center;
	justify-content: center;
}

.activity-day.blank,
.activity-day.future {
	background: transparent;
}

.activity-day.future {
	box-shadow: inset 0 0 0 1px var(--surface-muted-color);
}

/* today */
.activity-day.today {
	outline: 1.5px solid var(--heading-color, #2a2d48);
	outline-offset: 1px;
}

/* burned view: a white flame on the red-shaded square */
.activity-day svg {
	width: 9px;
	height: 9px;
	fill: #fff;
	transform: scale(var(--flame-scale, 1));
	filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.35));
}

/* the level inside a level-up ring: tiny, so tight and bold */
.activity-day-level {
	font-size: 7px;
	font-weight: 800;
	line-height: 1;
	letter-spacing: -0.4px;
	font-variant-numeric: tabular-nums;
	color: var(--heading-color, #2a2d48);
	pointer-events: none;
}

/* over the darker shades */
.activity-day-level.on-fill {
	color: #fff;
	text-shadow: 0 0 1px rgba(0, 0, 0, 0.45);
}

.activity-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	font-size: 11px;
	color: var(--font-sec-color);
}

/* rings over whatever the view shades: level ups (and the fastest possible next one) and resets,
   in colours none of the views use */
.activity-day.level-up,
.activity-mark-swatch.level-up {
	box-shadow: inset 0 0 0 2px #f5a400;
}

/* a reset: the ring plus diagonal lines, over the shading */
.activity-day.reset,
.activity-mark-swatch.reset {
	box-shadow: inset 0 0 0 2px var(--heading-color, #2a2d48);
	background-image: repeating-linear-gradient(
		-45deg,
		var(--heading-color, #2a2d48) 0 1px,
		transparent 1px 3px
	);
}

/* the fastest possible next level up: not happened yet, so dotted */
.activity-day.predicted,
.activity-mark-swatch.predicted {
	box-sizing: border-box;
	box-shadow: none;
	border: 1.5px dotted #f5a400;
}

/* projected JLPT / Jōyō / level 60 */
.activity-day.target,
.activity-mark-swatch.target {
	box-shadow: inset 0 0 0 2px #7c5cff;
}

.activity-mark-swatch.reviews {
	background-color: var(--reviews-color, #00aaff);
	background-image: repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.4) 0 1.5px, transparent 1.5px 4px);
}

.activity-marks {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px 12px;
	margin: -4px 0 0;
	font-size: 11px;
	font-weight: 700;
	color: var(--heading-color, #2a2d48);
}

.activity-mark {
	display: flex;
	align-items: center;
	gap: 5px;
}

.activity-mark-swatch {
	flex-shrink: 0;
	width: 11px;
	height: 11px;
	border-radius: 3px;
}

.activity-info {
	flex-shrink: 0;
	color: var(--font-sec-color);
}

/* at the fastest pace (and the fastest possible next level up): dotted green */
.activity-day.fast,
.activity-mark-swatch.fast,
.activity-big-day.fast {
	box-sizing: border-box;
	box-shadow: none;
	border: 1.5px dotted #30a46c;
}

/* a JLPT / Jōyō / level 60 day is also a level up: violet inside the dotted ring */
.activity-day.target.predicted,
.activity-day.target.fast,
.activity-big-day.target.predicted,
.activity-big-day.target.fast {
	box-shadow: inset 0 0 0 1.5px #7c5cff;
}

.activity-big-tag.predicted.fast {
	color: #2f9e5f;
	border-color: #30a46c;
}

/* on a busy day's blue: a light tag, so it stays readable */
.activity-big-day.on-fill .activity-big-tag.predicted,
.activity-big-day.on-fill .activity-big-tag.target.fast {
	background: rgba(255, 255, 255, 0.92);
}

/* targets at the fastest pace: outlined */
.activity-big-tag.target.fast {
	background: transparent;
	color: #7c5cff;
	box-shadow: inset 0 0 0 1px #7c5cff;
}

.activity-legend {
	display: flex;
	align-items: center;
	gap: 3px;
}

.activity-legend .swatch {
	display: block;
	box-sizing: border-box;
	width: 10px;
	height: 10px;
	border-radius: 2px;
	background: var(--surface-muted-color);
}
</style>
