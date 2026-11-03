<template>
	<div class="container trouble-page">
		<!-- the subjects you keep getting wrong (troubleSubjects.ts): tiles, or a row each with why -->
		<div class="trouble-toolbar">
			<div class="trouble-views" role="tablist" aria-label="View">
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
			<!-- the listed ones (as filtered) as flashcards: in the toolbar, no row of its own -->
			<button
				v-if="marksOn && entries.length"
				type="button"
				class="trouble-practice-button"
				:title="`Practice these ${entries.length} subjects as flashcards, worst first`"
				@click="practice"
			>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
				Practice {{ entries.length }}
			</button>
			<select v-model="filter" class="trouble-filter" aria-label="Filter">
				<option v-for="option in FILTERS" :key="option.id" :value="option.id">{{ option.label }}</option>
			</select>
			<!-- what counts as trouble: on hover / click -->
			<InfoTip v-if="marksOn" class="trouble-info" label="What makes a subject trouble">
				<p>
					A subject is trouble when you keep getting its meaning or reading wrong: under 80% right, at
					least 3 wrong answers, and few right in a row since (wrong answers ÷ right ones in a
					row<sup>1.5</sup> of 2 or more, the "leech" score WaniKani users know; 5 or more: most
					trouble).
				</p>
				<p>
					Only subjects in Apprentice count: from Guru up you've been getting them right lately. One
					leaves the list on its own once you get it right a few times in a row.
				</p>
			</InfoTip>
		</div>

		<p v-if="!marksOn" class="trouble-empty">
			Trouble subjects are turned off in Settings → Popup.
		</p>

		<template v-else>
			<QueueSubjectsView
				v-if="view === 'tiles'"
				:header-title="headerTitle"
				:sections="sections"
				:height="370"
				:bar-sorting="barSorting"
				menu-key="trouble"
				:empty-message="emptyMessage"
			/>

			<div v-else class="trouble-rows">
				<p v-if="!rows.length" class="trouble-empty">{{ emptyMessage }}</p>
				<template v-else>
					<!-- how many, then the columns' names, once: every row below lines up with them -->
					<div class="trouble-table-head">
						<span class="trouble-table-count" v-html="headerTitle"></span>
						<span aria-hidden="true">Right</span><span aria-hidden="true">Wrong</span><span aria-hidden="true">In a row</span>
						<span></span>
					</div>
					<button
						v-for="row in rows"
						:key="row.id"
						type="button"
						class="trouble-row"
						:class="{ serious: row.serious }"
						:title="row.title"
						@click="$router.push({ name: 'Subject', params: { id: row.id } })"
					>
						<span
							class="trouble-row-subject"
							:class="{ long: row.characters.length >= 3, longer: row.characters.length >= 5 }"
							:style="{ background: row.typeColor }"
						>
							<img v-if="row.image" :src="row.image" alt="">
							<template v-else>{{ row.characters }}</template>
						</span>
						<span class="trouble-row-meaning">{{ row.meaning }}</span>
						<!-- a line per part: its name, then a cell per column -->
						<span v-for="part in row.parts" :key="part.label" class="trouble-row-part" :class="{ bad: part.trouble }">
							<b>{{ part.label }}</b>
							<span class="trouble-cell">{{ part.percent }}%</span>
							<span class="trouble-cell">{{ part.incorrect }}</span>
							<span class="trouble-cell">{{ part.streak }}</span>
						</span>
						<span class="trouble-row-score" :title="`Trouble score ${row.score.toFixed(1)} (2 and up: trouble, 5 and up: most trouble)`">
							<span class="trouble-meter"><span :style="{ width: `${row.meter}%` }"></span></span>
							<span class="trouble-row-stage" :style="{ background: row.stageColor }">{{ row.stage }}</span>
						</span>
					</button>
				</template>
			</div>
		</template>
	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import { useSettingsStore } from '@/stores/settings';
import QueueSubjectsView from '@/components/Queue/QueueSubjectsView.vue';
import InfoTip from '@/components/InfoTip.vue';
import { buildQueueSubjectItems } from '@/utils/scripts/queueSubjects';
import { primaryMeaning, srsStages, typeColors } from '@/utils/scripts/wanikani';
import { SERIOUS_TROUBLE_SCORE, sortedTrouble, troubleText, useTroubleSubjects } from '@/utils/scripts/troubleSubjects';

const SECTIONS = [
	{ id: 'serious', label: 'Most trouble', color: '#e5484d' },
	{ id: 'trouble', label: 'Trouble', color: '#e0a020' },
];

const VIEWS = [
	{ id: 'tiles', label: 'Tiles' },
	{ id: 'list', label: 'Details' },
];

const FILTERS = [
	{ id: 'all', label: 'All' },
	{ id: 'meaning', label: 'Meaning trouble' },
	{ id: 'reading', label: 'Reading trouble' },
	{ id: 'radical', label: 'Radicals' },
	{ id: 'kanji', label: 'Kanji' },
	{ id: 'vocabulary', label: 'Vocabulary' },
];

const VIEW_STORAGE_KEY = 'troubleView';

function savedView() {
	try {
		return localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'tiles';
	} catch {
		return 'tiles';
	}
}

const typeOf = type => (type === 'kana_vocabulary' ? 'vocabulary' : type);

export default {
	name: 'TroubleSubjects',

	components: {
		InfoTip,
		QueueSubjectsView,
	},

	data() {
		return {
			view: savedView(),
			filter: 'all',
			/** subjects not in memory yet (the full list still loading), by id */
			resolved: {},
			VIEWS,
			FILTERS,
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		marksOn() {
			return useSettingsStore().settings.extension_popup_interface?.trouble_marks !== false;
		},
		/** worst first, filtered */
		entries() {
			const all = sortedTrouble(useTroubleSubjects().byId);
			const filter = this.filter;
			if (filter === 'all') return all;
			if (filter === 'meaning' || filter === 'reading') return all.filter(entry => entry.part === filter || entry.part === 'both');
			return all.filter(entry => typeOf(entry.subjectType) === filter);
		},
		subjectById() {
			return new Map(this.wk.allSubjects.map(subject => [subject.id, subject]));
		},
		sections() {
			return SECTIONS.map(section => ({
				...section,
				items: buildQueueSubjectItems(
					this.entries.filter(entry => (section.id === 'serious') === entry.serious).map(entry => entry.id),
					this.wk.assignments,
					[...this.wk.allSubjects, ...Object.values(this.resolved)],
				),
			})).filter(section => section.items.length);
		},
		barSorting() {
			return Object.fromEntries(SECTIONS.map((section, index) => [section.id, index]));
		},
		headerTitle() {
			const count = this.entries.length;
			return `<b>${count}</b> trouble ${count === 1 ? 'subject' : 'subjects'}`;
		},
		emptyMessage() {
			return this.filter === 'all'
				? 'No trouble subjects: nothing you keep getting wrong. Nice!'
				: 'Nothing matches this filter.';
		},
		rows() {
			const assignmentById = new Map(this.wk.assignments.map(assignment => [assignment.subject_id, assignment]));
			return this.entries.map(entry => {
				const subject = this.subjectById.get(entry.id) ?? this.resolved[entry.id] ?? {};
				const stage = assignmentById.get(entry.id)?.srs_stage;
				const type = subject.object ?? subject.type ?? entry.subjectType;
				const part = (label, data, trouble) => (data ? { label, trouble, ...data } : null);
				return {
					id: entry.id,
					serious: entry.serious,
					score: entry.score,
					// full at twice the "most trouble" score
					meter: Math.min(100, (entry.score / (SERIOUS_TROUBLE_SCORE * 2)) * 100),
					typeColor: typeColors[type] ?? typeColors.vocabulary,
					characters: subject.characters ?? '?',
					image: !subject.characters ? subject.character_images?.find(image => image.content_type === 'image/svg+xml')?.url ?? null : null,
					meaning: primaryMeaning(subject) || '…',
					parts: [
						part('Meaning', entry.meaning, entry.part !== 'reading'),
						part('Reading', entry.reading, entry.part !== 'meaning'),
					].filter(Boolean),
					stage: srsStages[stage]?.short ?? '–',
					stageColor: srsStages[stage]?.color ?? '#8a8fa3',
					title: troubleText(entry),
				};
			});
		},
	},

	watch: {
		entries: {
			handler() {
				void this.resolveMissing();
			},
			immediate: true,
		},
	},

	created() {
		if (!this.wk.assignments.length) void this.wk.loadDashboardFromCache();
	},

	methods: {
		async resolveMissing() {
			const ids = this.entries.map(entry => entry.id).filter(id => !this.subjectById.has(id) && !this.resolved[id]);
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
		/** the listed ones (as filtered), worst first, in Practice */
		practice() {
			this.$router.push({
				name: 'Practice',
				query: { ids: this.entries.map(entry => entry.id).join(','), title: 'Trouble subjects', from: this.$route.fullPath },
			});
		},
	},
};
</script>

<style>
/* the list is the whole page: it reaches the bottom even when short (no cut-off look) */
.trouble-page .subject-list-panel .panel-sections {
	flex: none;
	height: var(--subject-list-height);
}
</style>

<style scoped>
.trouble-page {
	background-color: var(--default-color);
	padding-bottom: 20px;
}

.trouble-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 10px 4px 8px;
}

.trouble-views {
	display: flex;
	padding: 2px;
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.08);
}

.trouble-views button {
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

.trouble-views button.active {
	background: rgba(255, 255, 255, 0.16);
	color: #fff;
}

.trouble-filter {
	padding: 4px 8px;
	border: 1px solid rgba(255, 255, 255, 0.15);
	border-radius: 6px;
	background: rgba(255, 255, 255, 0.08);
	color: #fff;
	font-family: inherit;
	font-size: 12px;
}

.trouble-filter option {
	color: #000;
}

/* between the view switch and the filter (they keep their sides) */
.trouble-practice-button {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	margin-left: auto;
	padding: 5px 12px 5px 10px;
	border: none;
	border-radius: 999px;
	background: var(--pill-color, #e36f94);
	color: #fff;
	font-family: inherit;
	font-size: 12px;
	font-weight: 700;
	white-space: nowrap;
	cursor: pointer;
}

.trouble-practice-button svg {
	width: 11px;
	height: 11px;
	fill: currentColor;
}

.trouble-practice-button:hover {
	filter: brightness(1.08);
}

.trouble-rows {
	display: flex;
	flex-direction: column;
	gap: 5px;
	padding: 0 4px;
}

.trouble-rows-head {
	margin-bottom: 4px;
	font-size: 13px;
	color: #c4c6da;
}

.trouble-rows-head :deep(b) {
	color: #fff;
}

.trouble-empty {
	padding: 30px 12px;
	text-align: center;
	color: #b3b6cc;
	font-size: 13px;
}

/*
 * A table: the same columns for the header and every row (the subject, the name / part,
 * right, wrong, in a row, the score). Rows: the name, then a line per part.
 */
.trouble-table-head,
.trouble-row {
	display: grid;
	grid-template-columns: 64px minmax(0, 1fr) 40px 40px 58px 50px;
	column-gap: 8px;
	align-items: center;
}

.trouble-table-head {
	/* as the rows (the count lines up with the subjects) */
	padding: 2px 10px 4px 6px;
	border-left: 4px solid transparent;
	font-size: 9.5px;
	font-weight: 800;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: #8f92ad;
}

.trouble-table-head span {
	text-align: center;
	white-space: nowrap;
}

/* the count, over the subject and name columns */
.trouble-table-head .trouble-table-count {
	grid-column: 1 / 3;
	text-align: left;
	font-size: 13px;
	font-weight: 600;
	letter-spacing: 0;
	text-transform: none;
	color: #c4c6da;
}

.trouble-table-count :deep(b) {
	color: #fff;
}

.trouble-row {
	row-gap: 1px;
	width: 100%;
	padding: 6px 10px 6px 6px;
	border: none;
	border-left: 4px solid #e0a020;
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.06);
	color: #fff;
	font-family: inherit;
	text-align: left;
	cursor: pointer;
	transition: background-color 0.15s;
}

.trouble-row.serious {
	border-left-color: #e5484d;
}

.trouble-row:hover {
	background: rgba(255, 255, 255, 0.11);
}

/* the first column, all rows of the entry; long words get smaller (the column stays put) */
.trouble-row-subject {
	grid-column: 1;
	grid-row: 1 / span 3;
	align-self: center;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 40px;
	padding: 0 4px;
	box-sizing: border-box;
	overflow: hidden;
	border-radius: 6px;
	font-size: 18px;
	font-weight: 700;
	white-space: nowrap;
	box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.2);
}

.trouble-row-subject.long {
	font-size: 13px;
}

.trouble-row-subject.longer {
	font-size: 10.5px;
}

.trouble-row-subject img {
	width: 22px;
	height: 22px;
	filter: brightness(0) invert(1);
}

.trouble-row-meaning {
	grid-column: 2 / 6;
	font-size: 13px;
	font-weight: 700;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* a part's line: its cells go straight into the row's columns */
.trouble-row-part {
	display: contents;
	font-size: 11px;
}

.trouble-row-part b {
	grid-column: 2;
	font-size: 11px;
	color: #d6d8e8;
}

.trouble-cell {
	font-size: 11px;
	font-variant-numeric: tabular-nums;
	text-align: center;
	color: #c4c6da;
}

.trouble-row-part.bad .trouble-cell {
	color: #fff;
	font-weight: 700;
}

.trouble-row-part.bad b {
	color: #ffb057;
}

.trouble-row.serious .trouble-row-part.bad b {
	color: #ff8589;
}

.trouble-row-score {
	grid-column: 6;
	grid-row: 1 / span 3;
	justify-self: end;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 6px;
}

.trouble-meter {
	display: block;
	width: 46px;
	height: 5px;
	border-radius: 3px;
	background: rgba(255, 255, 255, 0.12);
	overflow: hidden;
}

.trouble-meter span {
	display: block;
	height: 100%;
	border-radius: 3px;
	background: #e0a020;
}

.trouble-row.serious .trouble-meter span {
	background: #e5484d;
}

.trouble-row-stage {
	min-width: 30px;
	padding: 2px 6px;
	box-sizing: border-box;
	border-radius: 999px;
	font-size: 10px;
	font-weight: 800;
	text-align: center;
	color: #fff;
}

.trouble-info {
	flex-shrink: 0;
	color: var(--font-sec-color);
}
</style>
