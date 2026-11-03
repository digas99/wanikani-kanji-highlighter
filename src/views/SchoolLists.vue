<template>
	<!-- JLPT / Jōyō: your progress through each level, for kanji and for WaniKani's words -->
	<div class="container school-lists">
		<!-- hero: about which level (JLPT) or grade (Jōyō) your kanji and words are at
		     (an estimate, schoolKanji.ts), the list switch, then each level's meters -->
		<section class="school-lists-card school-hero">
			<div class="school-hero-top">
			<span class="school-hero-kicker">Kanji &amp; vocab level
				<InfoTip label="How the level is worked out">
					<p>
						Where your kanji and words are, roughly. A level counts once
						{{ percent(READY_SHARE.kanji) }} of its kanji and {{ percent(READY_SHARE.words) }} of its words are
						passed, with the easier levels' (words ask less as WaniKani teaches many easy words late).
						Only WaniKani's words are counted.
					</p>
					<p v-if="school === 'jlpt'">
						A hint at which JLPT level's study materials would suit you, not
						whether you'd pass: grammar, reading and listening aren't counted.
						JLPT levels from Jonathan Waller's lists (tanos.co.uk), the ones most study tools use:
						the JLPT hasn't published official lists since 2010.
					</p>
					<p v-else>
						Jōyō grades are when Japanese schools teach each kanji (Gr 9: secondary school). A word
						is at the grade of its hardest kanji.
					</p>
					<p>Click a level for its subjects (or a bar's part to go straight to it).</p>
				</InfoTip>
			</span>
			<div class="school-hero-level" :class="{ none: !readiness.ready }">
				{{ heroLevel }}
			</div>
			<div class="school-hero-sub">
				<template v-if="readiness.next">
					Next: <b>{{ readiness.next.label }}</b>
					· {{ percent(readiness.next.kanji) }} of the kanji, {{ percent(readiness.next.words) }} of the words
				</template>
				<template v-else>Every level reached</template>
			</div>
			<div class="school-lists-tabs" role="tablist" aria-label="List">
				<button
					v-for="option in SCHOOLS"
					:key="option.key"
					type="button"
					role="tab"
					:aria-selected="school === option.key"
					:class="{ active: school === option.key }"
					@click="setSchool(option.key)"
				>{{ option.label }}</button>
			</div>
			</div>
			<div class="school-hero-meters">
				<div class="ready-table">
					<span></span><span class="ready-head">Kanji</span><span class="ready-head">Words</span><span></span>
					<template v-for="level in readiness.levels" :key="level.grade">
						<span class="ready-level" :class="{ ready: level.ready, next: level === readiness.next }">{{ level.label }}</span>
						<span v-for="part in ['kanji', 'words']" :key="part" class="ready-meter" :title="`${level.label}: ${percent(level[part])} of the ${part} up to this level passed`">
							<span class="ready-meter-bar"><span :style="{ width: percent(level[part]) }" :class="{ full: level[part] >= READY_SHARE[part] }"></span></span>
							<span class="ready-meter-value">{{ percent(level[part]) }}</span>
						</span>
						<span class="ready-mark" :title="level.ready ? 'Your kanji and words reach this level' : ''">{{ level.ready ? '✓' : '' }}</span>
					</template>
				</div>
			</div>
		</section>

		<section v-for="kind in KINDS" :key="kind.key" class="school-lists-card">
			<header class="school-lists-head">
				<span class="school-lists-title">{{ kind.label }}</span>
				<span class="school-lists-summary" :title="kind.key === 'vocabulary' ? WORDS_NOTE : ''">
					<b>{{ summaries[kind.key].passed.toLocaleString() }}</b> of {{ summaries[kind.key].total.toLocaleString() }} passed
					<!-- every level's subjects on one page, a section per level -->
					<RouterLink
						:to="{ name: 'SubjectGroups', query: { list: 'school', school, ...(kind.key === 'vocabulary' ? { kind: 'vocabulary' } : {}) } }"
						class="school-lists-all"
						:title="`All of them, by ${school === 'jlpt' ? 'level' : 'grade'}`"
					>All ›</RouterLink>
				</span>
			</header>
			<div class="school-lists-body">
				<SchoolKanjiProgress
					:key="`${school}-${kind.key}`"
					:school="school"
					:kind="kind.key"
					:subjects="wk.allSubjects"
					:complete="wk.allSubjectsInMemory"
					:marked-grade="markedGrade"
				/>
			</div>
		</section>

		<SchoolProgressLegend class="school-lists-legend" />

	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import SchoolKanjiProgress from '@/components/Home/SchoolKanjiProgress.vue';
import InfoTip from '@/components/InfoTip.vue';
import SchoolProgressLegend from '@/components/Home/SchoolProgressLegend.vue';
import { JLPT_READY_SHARE, SCHOOL_CONFIG, buildSchoolGradeStats, schoolReadiness, schoolRows } from '@/utils/scripts/schoolKanji';

const SCHOOLS = [
	{ key: 'jlpt', label: 'JLPT' },
	{ key: 'joyo', label: 'Jōyō' },
];

const KINDS = [
	{ key: 'kanji', label: 'Kanji' },
	{ key: 'vocabulary', label: 'Words' },
];

const WORDS_NOTE = 'WaniKani\'s words in these lists (other words in them aren\'t on WaniKani)';

const SCHOOL_STORAGE_KEY = 'schoolListsSchool';

function savedSchool() {
	try {
		return localStorage.getItem(SCHOOL_STORAGE_KEY) === 'joyo' ? 'joyo' : 'jlpt';
	} catch {
		return 'jlpt';
	}
}

export default {
	name: 'SchoolLists',

	components: {
		InfoTip,
		SchoolKanjiProgress,
		SchoolProgressLegend,
	},

	data() {
		return {
			school: this.$route.query.school === 'joyo' || this.$route.query.school === 'jlpt' ? this.$route.query.school : savedSchool(),
			SCHOOLS,
			KINDS,
			WORDS_NOTE,
			READY_SHARE: JLPT_READY_SHARE,
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		/** ?grade=n3: a level pointed out (from a subject's details), on the list it belongs to */
		markedGrade() {
			const grade = String(this.$route.query.grade ?? '');
			return SCHOOL_CONFIG[this.school].grades.includes(grade) ? grade : '';
		},
		/** of the list shown (the Profile's tile is JLPT only) */
		readiness() {
			const complete = this.wk.allSubjectsInMemory;
			return schoolReadiness(
				this.school,
				schoolRows(this.wk.allSubjects, this.school, 'kanji', complete),
				schoolRows(this.wk.allSubjects, this.school, 'vocabulary', complete),
			);
		},
		/** "N4", "Grade 3", "Secondary" (Gr 9), or a dash before the first one */
		heroLevel() {
			const ready = this.readiness.levels.filter(level => level.ready).at(-1);
			if (!ready) return '–';
			if (this.school === 'jlpt') return ready.label;
			return ready.grade === 'g9' ? 'Secondary' : `Grade ${ready.grade.charAt(1)}`;
		},
		/** passed (burned included) / all, per kind, across the list's levels */
		summaries() {
			return Object.fromEntries(KINDS.map(kind => {
				let passed = 0;
				let total = 0;
				for (const grade of SCHOOL_CONFIG[this.school].grades) {
					const stats = buildSchoolGradeStats(this.wk.allSubjects, this.school, grade, kind.key);
					total += stats.total;
					passed += stats.segments
						.filter(segment => segment.column === 'burned' || segment.column === 'passed')
						.reduce((sum, segment) => sum + segment.count, 0);
				}
				return [kind.key, { passed, total }];
			}));
		},
	},

	watch: {
		// opened again with another list (a details chip, while already here)
		'$route.query.school'(school) {
			if (school === 'jlpt' || school === 'joyo') this.school = school;
		},
	},

	methods: {
		percent(share) {
			return `${Math.floor(share * 100)}%`;
		},
		setSchool(school) {
			this.school = school;
			try {
				localStorage.setItem(SCHOOL_STORAGE_KEY, school);
			} catch {
				// only remembers the choice
			}
		},
	},
};
</script>

<style scoped>
.school-lists {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding-bottom: 16px;
}

/* the hero: the level big in the middle, the list switch under it, then the meters */
.school-hero {
	margin-top: 10px;
}

/* dark in both themes, as Home's hero and the Profile header */
.school-hero-top {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 16px 12px 14px;
	background-color: var(--default-color);
	background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0));
	color: #fff;
}

.school-hero-kicker {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 10.5px;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: rgba(255, 255, 255, 0.6);
}

.school-hero-level {
	margin: 2px 0;
	font-size: 52px;
	font-weight: 900;
	line-height: 1.05;
	letter-spacing: -0.01em;
	/* white: the pink switch under it is accent enough */
	color: #fff;
}

.school-hero-level.none {
	color: rgba(255, 255, 255, 0.4);
}

.school-hero-sub {
	font-size: 12px;
	color: rgba(255, 255, 255, 0.7);
	text-align: center;
}

.school-hero-sub b {
	color: #fff;
}

.school-hero .school-lists-tabs {
	margin-top: 12px;
	background: rgba(255, 255, 255, 0.08);
	border-color: rgba(255, 255, 255, 0.14);
}

.school-hero .school-lists-tabs button:not(.active) {
	color: rgba(255, 255, 255, 0.65);
}

.school-hero .school-lists-tabs button:hover:not(.active) {
	color: #fff;
}

.school-hero-meters {
	padding: 12px;
}

.school-lists-tabs {
	display: flex;
	gap: 2px;
	padding: 3px;
	border-radius: 10px;
	background: var(--surface-muted-color);
	border: 1px solid var(--surface-border-color);
}

.school-lists-tabs button {
	min-width: 72px;
	padding: 6px 14px;
	border: none;
	border-radius: 7px;
	background: transparent;
	color: var(--tab-inactive-color);
	font-family: inherit;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
	transition: background-color 0.2s, color 0.2s;
}

.school-lists-tabs button.active {
	background: var(--pill-color, #e36f94);
	color: #fff;
}

.school-lists-tabs button:hover:not(.active) {
	color: var(--heading-color, #2a2d48);
}

/* as Home's cards */
.school-lists-card {
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	border-radius: var(--card-radius, 12px);
	box-shadow: 0 2px 10px var(--shadow-soft-color);
	overflow: hidden;
}

.school-lists-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 12px 12px 0;
}

.school-lists-title {
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

.school-lists-summary {
	font-size: 12px;
	color: var(--font-sec-color);
}

.school-lists-summary b {
	color: var(--font-color);
}

.school-lists-all {
	margin-left: 8px;
	font-weight: 700;
	color: var(--pill-color, #e36f94);
	text-decoration: none;
	white-space: nowrap;
}

.school-lists-all:hover {
	text-decoration: underline;
}

.school-lists-body {
	padding: 10px 12px 12px;
}

/* readiness: a row per level (label, kanji, words, ✓), the columns lined up */
.ready-table {
	display: grid;
	grid-template-columns: 38px 1fr 1fr 18px;
	align-items: center;
	gap: 6px 10px;
}

.ready-head {
	font-size: 10px;
	font-weight: 800;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--font-sec-color);
}

.ready-level {
	padding: 4px 0;
	border-radius: 6px;
	background: var(--surface-muted-color);
	color: var(--font-color);
	font-size: 12px;
	font-weight: 800;
	text-align: center;
}

.ready-level.ready {
	background: #30a46c;
	color: #fff;
}

.ready-level.next {
	box-shadow: inset 0 0 0 2px var(--pill-color, #e36f94);
}

.ready-meter {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
}

.ready-meter-bar {
	flex: 1;
	height: 7px;
	border-radius: 999px;
	background: var(--surface-muted-color);
	overflow: hidden;
}

.ready-meter-bar span {
	display: block;
	height: 100%;
	border-radius: 999px;
	background: var(--pill-color, #e36f94);
}

.ready-meter-bar span.full {
	background: #30a46c;
}

.ready-meter-value {
	flex-shrink: 0;
	width: 32px;
	font-size: 11px;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	text-align: right;
	color: var(--font-color);
}

.ready-mark {
	font-size: 13px;
	font-weight: 900;
	color: #30a46c;
}

.school-lists-legend {
	align-self: center;
}

</style>
