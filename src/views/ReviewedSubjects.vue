<template>
	<div class="container reviewed-page">
		<!-- tiles by result, or a row per subject with its SRS stage change (as v1's Reviews History) -->
		<div class="reviewed-toolbar">
			<div class="reviewed-views" role="tablist" aria-label="View">
				<button
					v-for="option in VIEWS"
					:key="option.id"
					type="button"
					role="tab"
					:aria-selected="view === option.id"
					:class="{ active: view === option.id }"
					@click="setView(option.id)"
				>{{ option.label }}</button>
			</div>
			<div v-if="view === 'changes'" class="reviewed-selects">
				<select :value="order" class="reviewed-filter" aria-label="Order" @change="setOrder($event.target.value)">
					<option v-for="option in ORDERS" :key="option.id" :value="option.id">{{ option.label }}</option>
				</select>
				<select v-model="filter" class="reviewed-filter" aria-label="Filter">
					<option v-for="option in FILTERS" :key="option.id" :value="option.id">{{ option.label }}</option>
				</select>
			</div>
			<!-- "Not scored": why, on hover / click -->
			<InfoTip v-if="summary?.unscored" class="reviewed-info" label="What “Not scored” means">
				"Not scored": reviewed before tracking started. WaniKani only shares running totals
				of right and wrong answers, so a review can only be scored when the totals from
				before it are known.
			</InfoTip>
		</div>

		<QueueSubjectsView
			v-if="view === 'tiles'"
			:header-title="headerTitle"
			:sections="sections"
			:height="394"
			:bar-sorting="barSorting"
			menu-key="reviewed"
			empty-message="No reviews on this day."
			:loading="!loaded"
		/>

		<div v-else class="reviewed-changes">
			<p class="reviewed-changes-head" v-html="headerTitle"></p>
			<p v-if="!rows.length" class="reviewed-empty">
				{{ summary?.items ? 'Nothing matches this filter.' : 'No reviews on this day.' }}
			</p>
			<button
				v-for="row in rows"
				:key="row.id"
				type="button"
				class="reviewed-row"
				:class="row.result"
				:title="`${row.meaning} · level ${row.level ?? '?'}`"
				@click="$router.push({ name: 'Subject', params: { id: row.id } })"
			>
				<span class="reviewed-row-subject" :style="{ background: row.typeColor }">
					<img v-if="row.image" :src="row.image" alt="">
					<template v-else>{{ row.characters }}</template>
				</span>
				<span class="reviewed-row-info">
					<span class="reviewed-row-meaning">{{ row.meaning }}</span>
					<span class="reviewed-row-meta">
						<template v-if="row.result === 'mistakes'"><b class="mistake">Mistake</b></template>
						<template v-else-if="row.result === 'correct'"><b class="correct">Correct</b></template>
						<template v-else>Not scored</template>
						<template v-if="order !== 'result' && row.time"> · {{ row.time }}</template>
						<template v-if="row.next"> · next {{ row.next }}</template>
					</span>
				</span>
				<span class="reviewed-row-stages">
					<template v-if="row.from != null">
						<span class="stage-chip" :style="{ background: stageColor(row.from) }">{{ stageShort(row.from) }}</span>
						<span class="stage-arrow" :class="row.direction" aria-hidden="true">→</span>
					</template>
					<span v-if="row.to != null" class="stage-chip" :style="{ background: stageColor(row.to) }" :title="stageName(row.to)">{{ stageShort(row.to) }}</span>
				</span>
			</button>
		</div>
	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import QueueSubjectsView from '@/components/Queue/QueueSubjectsView.vue';
import InfoTip from '@/components/InfoTip.vue';
import { buildQueueSubjectItems } from '@/utils/scripts/queueSubjects';
import { dayKey, readDaySummary, watchDailyActivity } from '@/utils/scripts/dailyActivity';
import { primaryMeaning, srsStages, typeColors } from '@/utils/scripts/wanikani';
import { prettyTime } from '@/utils/scripts/time';

/** The reviewed subjects of a day (default: today), by result. */
const RESULT_SECTIONS = [
	{ id: 'mistakes', label: 'With mistakes', color: '#e5484d' },
	{ id: 'correct', label: 'All correct', color: '#30a46c' },
	{ id: 'unscored', label: 'Not scored', color: '#8a8fa3' },
];

const VIEWS = [
	{ id: 'tiles', label: 'Tiles' },
	{ id: 'changes', label: 'SRS changes' },
];

const FILTERS = [
	{ id: 'all', label: 'All' },
	{ id: 'mistakes', label: 'With mistakes' },
	{ id: 'correct', label: 'All correct' },
	{ id: 'up', label: 'Moved up' },
	{ id: 'down', label: 'Moved down' },
	{ id: 'radical', label: 'Radicals' },
	{ id: 'kanji', label: 'Kanji' },
	{ id: 'vocabulary', label: 'Vocabulary' },
];

const ORDERS = [
	{ id: 'result', label: 'By result' },
	{ id: 'newest', label: 'Newest first' },
	{ id: 'oldest', label: 'Oldest first' },
];

const VIEW_STORAGE_KEY = 'reviewedView';
const ORDER_STORAGE_KEY = 'reviewedOrder';

function savedOrder() {
	try {
		const order = localStorage.getItem(ORDER_STORAGE_KEY);
		return ORDERS.some(option => option.id === order) ? order : 'result';
	} catch {
		return 'result';
	}
}

function savedView() {
	try {
		return localStorage.getItem(VIEW_STORAGE_KEY) === 'changes' ? 'changes' : 'tiles';
	} catch {
		return 'tiles';
	}
}

export default {
	name: 'ReviewedSubjects',

	components: {
		InfoTip,
		QueueSubjectsView,
	},

	data() {
		return {
			summary: null,
			/** the day's summary was read (it may be none: a day without reviews) */
			loaded: false,
			/** subjects not in memory yet (the full list is still loading), by id */
			resolved: {},
			view: savedView(),
			filter: 'all',
			order: savedOrder(),
			VIEWS,
			ORDERS,
			FILTERS,
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		date() {
			return typeof this.$route.query.date === 'string' ? this.$route.query.date : dayKey(new Date());
		},
		dayLabel() {
			const today = new Date();
			const yesterday = new Date();
			yesterday.setDate(today.getDate() - 1);
			if (this.date === dayKey(today)) return 'today';
			if (this.date === dayKey(yesterday)) return 'yesterday';
			const [year, month, day] = this.date.split('-').map(Number);
			return `on ${new Date(year, month - 1, day).toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
		},
		sections() {
			if (!this.summary?.subjects) return [];
			return RESULT_SECTIONS.map(section => ({
				...section,
				items: buildQueueSubjectItems(this.summary.subjects[section.id], this.wk.assignments, this.wk.allSubjects),
			})).filter(section => section.items.length);
		},
		barSorting() {
			return Object.fromEntries(RESULT_SECTIONS.map((section, index) => [section.id, index]));
		},
		headerTitle() {
			const count = this.summary?.items ?? 0;
			return `<b>${count}</b> ${count === 1 ? 'subject' : 'subjects'} reviewed ${this.dayLabel}`;
		},
		/** One row per reviewed subject: mistakes first, then the biggest stage moves. */
		allRows() {
			if (!this.summary?.subjects) return [];
			const subjectById = new Map(this.wk.allSubjects.map(subject => [subject.id, subject]));
			const assignmentById = new Map(this.wk.assignments.map(assignment => [assignment.subject_id, assignment]));
			const now = Date.now();
			return RESULT_SECTIONS.flatMap(section => this.summary.subjects[section.id].map(id => {
				const subject = subjectById.get(id) ?? this.resolved[id] ?? {};
				const assignment = assignmentById.get(id);
				const type = subject.object ?? subject.type ?? subject.subject_type ?? assignment?.subject_type ?? 'vocabulary';
				const [from, to] = this.summary.stages?.[id] ?? [null, assignment?.srs_stage ?? null];
				const availableAt = assignment?.available_at ? Date.parse(assignment.available_at) : NaN;
				// when it was answered: kept by the daily tracking; else (days tracked before that) the
				// assignment's last change, if it falls on this day
				const changedAt = assignment?.data_updated_at ? Date.parse(assignment.data_updated_at) : NaN;
				const at = this.summary.times?.[id]
					?? (changedAt >= this.dayRange[0] && changedAt < this.dayRange[1] ? changedAt : null);
				return {
					id,
					result: section.id,
					type: type === 'kana_vocabulary' ? 'vocabulary' : type,
					typeColor: typeColors[type] ?? typeColors.vocabulary,
					characters: subject.characters ?? '?',
					image: !subject.characters ? subject.character_images?.find(image => image.content_type === 'image/svg+xml')?.url ?? null : null,
					meaning: primaryMeaning(subject) || subject.meaning || '…',
					level: subject.level,
					from,
					to,
					direction: from == null || to == null || from === to ? 'same' : to > from ? 'moved-up' : 'moved-down',
					at,
					time: at ? new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null,
					next: Number.isFinite(availableAt) && availableAt > now
						? `in ${prettyTime(availableAt - now, { short: true, seconds: false })}`
						: null,
				};
			}));
		},
		dayRange() {
			const [year, month, day] = this.date.split('-').map(Number);
			return [new Date(year, month - 1, day).getTime(), new Date(year, month - 1, day + 1).getTime()];
		},
		/** by result (as listed), or by when each was answered (unknown times last) */
		orderedRows() {
			if (this.order === 'result') return this.allRows;
			const sign = this.order === 'newest' ? -1 : 1;
			return [...this.allRows].sort((a, b) => {
				if (a.at == null || b.at == null) return (a.at == null) - (b.at == null);
				return sign * (a.at - b.at);
			});
		},
		rows() {
			const filter = this.filter;
			const rows = this.orderedRows;
			if (filter === 'all') return rows;
			if (filter === 'mistakes' || filter === 'correct') return rows.filter(row => row.result === filter);
			if (filter === 'up' || filter === 'down') return rows.filter(row => row.direction === `moved-${filter}`);
			return rows.filter(row => row.type === filter);
		},
	},

	watch: {
		date() {
			void this.load();
		},
	},

	created() {
		if (!this.wk.assignments.length) void this.wk.loadDashboardFromCache();
		void this.load();
		// today's list grows as the background sync finds new reviews
		this.unwatch = watchDailyActivity(() => void this.load());
	},

	beforeUnmount() {
		this.unwatch?.();
	},

	methods: {
		async load() {
			this.summary = await readDaySummary(this.date);
			this.loaded = true;
			await this.resolveMissing();
		},
		async resolveMissing() {
			const known = new Set(this.wk.allSubjects.map(subject => subject.id));
			const ids = Object.values(this.summary?.subjects ?? {}).flat()
				.filter(id => !known.has(id) && !this.resolved[id]);
			if (!ids.length) return;
			const subjects = await this.wk.resolveSubjects(ids);
			if (!subjects?.length) return;
			this.resolved = { ...this.resolved, ...Object.fromEntries(subjects.map(subject => [subject.id, subject])) };
		},
		setView(view) {
			this.view = view;
			try {
				localStorage.setItem(VIEW_STORAGE_KEY, view);
			} catch {
				// only remembers the choice
			}
		},
		setOrder(order) {
			this.order = order;
			try {
				localStorage.setItem(ORDER_STORAGE_KEY, order);
			} catch {
				// only remembers the choice
			}
		},
		stageName(stage) {
			return srsStages[stage]?.name ?? 'Locked';
		},
		stageShort(stage) {
			return srsStages[stage]?.short ?? '–';
		},
		stageColor(stage) {
			return srsStages[stage]?.color ?? '#8a8fa3';
		},
	},
};
</script>

<style>
/* the list is the whole page: it reaches the bottom even when short (no cut-off look) */
.reviewed-page .subject-list-panel .panel-sections {
	flex: none;
	height: var(--subject-list-height);
}
</style>

<style scoped>
.reviewed-page {
	background-color: var(--default-color);
	padding-bottom: 20px;
}

.reviewed-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 10px 4px 8px;
}

.reviewed-views {
	display: flex;
	padding: 2px;
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.08);
}

.reviewed-views button {
	padding: 4px 12px;
	border: none;
	border-radius: 6px;
	background: transparent;
	color: #c4c6da;
	font-family: inherit;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
}

.reviewed-views button.active {
	background: rgba(255, 255, 255, 0.16);
	color: #fff;
}

.reviewed-selects {
	display: flex;
	gap: 6px;
	/* on the right, the ⓘ right after them */
	margin-left: auto;
}

.reviewed-filter {
	padding: 4px 8px;
	border: 1px solid rgba(255, 255, 255, 0.15);
	border-radius: 6px;
	background: rgba(255, 255, 255, 0.08);
	color: #fff;
	font-family: inherit;
	font-size: 12px;
}

.reviewed-filter option {
	color: #000;
}

.reviewed-changes {
	display: flex;
	flex-direction: column;
	gap: 5px;
	padding: 0 4px;
}

.reviewed-changes-head {
	margin-bottom: 4px;
	font-size: 13px;
	color: #c4c6da;
}

.reviewed-changes-head :deep(b) {
	color: #fff;
}

.reviewed-empty {
	padding: 30px 0;
	text-align: center;
	color: #b3b6cc;
	font-size: 13px;
}

.reviewed-row {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 6px 10px 6px 6px;
	border: none;
	border-left: 4px solid #8a8fa3;
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.06);
	color: #fff;
	font-family: inherit;
	text-align: left;
	cursor: pointer;
	transition: background-color 0.15s;
}

.reviewed-row:hover {
	background: rgba(255, 255, 255, 0.11);
}

.reviewed-row.mistakes {
	border-left-color: #e5484d;
}

.reviewed-row.correct {
	border-left-color: #30a46c;
}

.reviewed-row-subject {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 38px;
	height: 38px;
	padding: 0 6px;
	box-sizing: border-box;
	border-radius: 6px;
	font-size: 18px;
	font-weight: 700;
	white-space: nowrap;
	box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.2);
}

.reviewed-row-subject img {
	width: 22px;
	height: 22px;
	filter: brightness(0) invert(1);
}

.reviewed-row-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.reviewed-row-meaning {
	font-size: 13px;
	font-weight: 700;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.reviewed-row-meta {
	font-size: 11px;
	color: #b3b6cc;
}

.reviewed-row-meta .mistake {
	color: #ff8589;
}

.reviewed-row-meta .correct {
	color: #5bd68f;
}

.reviewed-row-stages {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: 4px;
}

.stage-chip {
	min-width: 30px;
	padding: 3px 6px;
	box-sizing: border-box;
	border-radius: 999px;
	font-size: 10.5px;
	font-weight: 800;
	text-align: center;
	color: #fff;
}

.stage-arrow {
	font-size: 13px;
	font-weight: 800;
	color: #b3b6cc;
}

/* not .up / .down: global styles turn those */
.stage-arrow.moved-up {
	color: #5bd68f;
}

.stage-arrow.moved-down {
	color: #ff8589;
}

.reviewed-info {
	flex-shrink: 0;
	margin-left: 6px;
	color: var(--font-sec-color);
}
</style>
