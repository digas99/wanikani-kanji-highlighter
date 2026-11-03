<template>
	<!-- Home hero: who / which level, then what to do now (lessons, reviews), then what's next. -->
	<div class="home-hero">
		<!-- a level-up's celebration (once) -->
		<canvas v-if="celebrating" ref="confetti" class="hero-confetti" aria-hidden="true"></canvas>
		<!-- the level badge beside the name, bar and pills (centred on all of them) -->
		<div class="hero-top">
			<RouterLink :to="{ name: 'Profile' }" class="hero-level hero-level-badge-link clickable" title="Open your profile" tabindex="-1">
				<span class="hero-level-badge" :class="{ celebrating }">
					<small>Level</small>
					<strong :key="displayedLevel ?? level">{{ displayedLevel ?? level ?? '–' }}</strong>
				</span>
			</RouterLink>
			<div class="hero-info">
				<RouterLink :to="{ name: 'Profile' }" class="hero-level clickable" title="Open your profile">
					<span class="hero-level-info">
						<span class="hero-name-row">
							<span class="hero-username">{{ username || 'WaniKani' }}</span>
							<!-- right above the bar's part it describes -->
							<span
								v-if="todayChange"
								class="hero-progress-today-label"
								:class="todayChange.gained ? 'gain' : 'loss'"
							>{{ todayChange.label }} today</span>
						</span>
						<span class="hero-progress-track" :title="levelProgressTitle">
							<span class="hero-progress-fill" :style="{ width: `${displayedPercent}%` }"></span>
							<!-- what today changed: the part gained (or lost), at its place on the bar -->
							<span
								v-if="todayChange"
								class="hero-progress-today"
								:class="[todayChange.gained ? 'gain' : 'loss', { shown: barReady }]"
								:style="{ left: `${todayChange.from}%`, width: `${todayChange.to - todayChange.from}%` }"
							></span>
						</span>
					</span>
				</RouterLink>
				<!-- under the bar: its percentage, and (right end) the level up's practice -->
				<div class="hero-progress-row">
					<RouterLink :to="{ name: 'Profile' }" class="hero-progress-label clickable" title="Open your profile" tabindex="-1">
						<template v-if="levelProgressKnown">
							{{ levelPercent.toFixed(0) }}% of level {{ level ?? '' }} stages done
						</template>
						<template v-else>Level progress: –</template>
					</RouterLink>
					<!-- right away: flashcards of what this level up still needs (its radicals and kanji not passed yet) -->
					<RouterLink
						v-if="levelUpIds.length"
						:to="levelUpPractice"
						class="hero-levelup"
						:title="`Practice the ${levelUpIds.length} radicals and kanji of level ${level} not passed yet (the ones the level up needs), as flashcards`"
					>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
						Practice {{ levelUpIds.length }}
					</RouterLink>
				</div>
			</div>
			<!-- under the level bar, in one row: friends, pages read, trouble subjects (accolades: on the Profile) -->
			<div class="hero-pills">
			<RouterLink :to="{ name: 'Friends' }" class="hero-friends" :title="`Friends (${friendCount})`">
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<circle cx="9" cy="8" r="3.2" /><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
					<circle cx="17" cy="9" r="2.6" /><path d="M15.8 13.7c2.9.2 5.2 2.2 5.2 5" />
				</svg>
				<span>{{ friendCount }} <span class="hero-pill-word">{{ friendCount === 1 ? 'friend' : 'friends' }}</span></span>
			</RouterLink>
			<!-- pages read (the reading level history); off: an invitation to try it -->
			<RouterLink :to="{ name: 'Pages' }" class="hero-friends" :title="pagesTitle">
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h4" />
				</svg>
				<span v-if="pagesOn">{{ pagesCount }} <span class="hero-pill-word">{{ pagesCount === 1 ? 'page' : 'pages' }}</span></span>
				<span v-else>Pages</span>
				<span v-if="!pagesOn" class="hero-pill-new" aria-label="New"></span>
			</RouterLink>
			<!-- the subjects you keep getting wrong (only when there are some) -->
			<RouterLink
				v-if="troubleCount"
				:to="{ name: 'Trouble' }"
				class="hero-friends hero-trouble"
				:title="`${troubleCount} trouble ${troubleCount === 1 ? 'subject' : 'subjects'}: the ones you keep getting wrong`"
			>
				<span class="hero-trouble-mark" aria-hidden="true">!</span>
				<span>{{ troubleCount }} <span class="hero-pill-word">trouble</span></span>
			</RouterLink>
			</div>
		</div>

		<div class="hero-actions">
			<div class="hero-action lessons">
				<RouterLink :to="{ name: 'Lessons' }" class="hero-action-main" title="See the lessons queue">
					<span class="hero-action-count">{{ lessons.length }}</span>
					<span class="hero-action-label">Lessons</span>
				</RouterLink>
				<a
					v-if="lessons.length"
					:href="WANIKANI_LESSONS_URL"
					target="_blank"
					rel="noopener"
					class="hero-action-external"
					title="Start your lessons on WaniKani"
				>Do on WaniKani <span aria-hidden="true">↗</span></a>
				<!-- none: nothing to go do -->
				<span v-else class="hero-action-external done">All done for now <span aria-hidden="true">✓</span></span>
			</div>
			<div class="hero-action reviews">
				<RouterLink :to="{ name: 'Reviews' }" class="hero-action-main" title="See the reviews queue">
					<span class="hero-action-count">{{ reviews.length }}</span>
					<span class="hero-action-label">Reviews</span>
				</RouterLink>
				<a
					v-if="reviews.length"
					:href="WANIKANI_REVIEWS_URL"
					target="_blank"
					rel="noopener"
					class="hero-action-external"
					title="Start your reviews on WaniKani"
				>Do on WaniKani <span aria-hidden="true">↗</span></a>
				<span v-else class="hero-action-external done">All done for now <span aria-hidden="true">✓</span></span>
			</div>
		</div>

		<RouterLink :to="{ name: 'Reviews' }" class="hero-next">
			<template v-if="nextInfo">
				<span class="hero-next-dot"></span>
				<span>
					<b>+{{ nextInfo.count }}</b> reviews
					<template v-if="nextInfo.time">in <b>{{ nextInfo.time }}</b></template>
					<template v-else><b>now</b></template>
				</span>
				<span class="hero-next-when">{{ nextInfo.label }}</span>
			</template>
			<span v-else class="hero-next-empty">No upcoming reviews</span>
		</RouterLink>

		<!-- extra rows (Home puts today's activity here) -->
		<slot />
	</div>
</template>

<script>
import { RouterLink } from 'vue-router';
import { prettyTime } from '@/utils/scripts/time';
import { levelProgressChange } from '@/utils/scripts/wanikani';
import { useFriendCount } from '@/utils/scripts/friendCount';
import { useSettingsStore } from '@/stores/settings';
import { readPageHistory, watchPageHistory } from '@/utils/scripts/pageHistory';
import { markCelebrated, pendingCelebration, watchMilestones } from '@/utils/scripts/milestones';
import { confettiBurst } from '@/utils/scripts/confetti';
import { useTroubleSubjects } from '@/utils/scripts/troubleSubjects';
import { useWKStore } from '@/stores';

const LEVEL_STEP_MS = 450;

export default {
	name: 'ReviewsInfo',

	components: {
		RouterLink,
	},

	props: {
		// null when nothing is scheduled (and before the summary loads)
		next: {
			type: Object,
			default: null,
		},
		lessons: {
			type: Array,
			default: () => [],
		},
		reviews: {
			type: Array,
			default: () => [],
		},
		level: {
			type: Number,
			default: null,
		},
		username: {
			type: String,
			default: '',
		},
		/** levelUpInfo().progress: { passed, size, percentage } */
		levelProgress: {
			type: Object,
			default: null,
		},
		/** the same, when today started (null: not known) */
		levelProgressBeforeToday: {
			type: Object,
			default: null,
		},
	},

	data() {
		return {
			now: Date.now(),
			timer: null,
			// starts empty and grows to the real value (see mounted)
			displayedPercent: 0,
			barReady: false,
			// a ref: unwrapped here, it stays up to date as friends change
			friendCount: useFriendCount(),
			pagesCount: 0,
			/** a level-up being celebrated: the badge counts up from the old level */
			celebrating: false,
			displayedLevel: null,
			stopWatchingMilestones: null,
			WANIKANI_LESSONS_URL: 'https://www.wanikani.com/subjects/lesson',
			WANIKANI_REVIEWS_URL: 'https://www.wanikani.com/subjects/review',
		};
	},

	computed: {
		pagesOn() {
			return useSettingsStore().settings.page_stats?.history === true;
		},
		/** empty when their marks are off in the settings */
		troubleCount() {
			return useTroubleSubjects().byId.size;
		},
		/**
		 * What the level up still needs, to practise: this level's radicals and kanji started but not
		 * passed yet (radicals first: they unlock kanji; then the lowest stages).
		 */
		levelUpIds() {
			const current = useWKStore().levelsInProgress.find(entry => Number(entry.level) === Number(this.level));
			if (!current) return [];
			const order = { radical: 0, kanji: 1 };
			return current.items
				.filter(group => group.id in order)
				.flatMap(group => group.items.map(item => ({ id: item.id, type: group.id, stage: Number(item.assignment?.srs_stage ?? 0), passed: Boolean(item.assignment?.passed_at) })))
				.filter(item => !item.passed && item.stage >= 1)
				.sort((a, b) => order[a.type] - order[b.type] || a.stage - b.stage)
				.map(item => item.id);
		},
		levelUpPractice() {
			return {
				name: 'Practice',
				query: { ids: this.levelUpIds.join(','), title: `Level ${this.level} level up`, from: '/' },
			};
		},
		pagesTitle() {
			return this.pagesOn
				? `Pages read: ${this.pagesCount}, with their reading level`
				: 'New: see the reading level of pages, and keep a history of what you read';
		},
		/** Not computed yet (subjects still loading, no saved snapshot): don't claim 0%. */
		levelProgressKnown() {
			return Number.isFinite(Number(this.levelProgress?.percentage));
		},
		levelPercent() {
			const value = Number(this.levelProgress?.percentage);
			return Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 0;
		},
		levelProgressTitle() {
			const progress = this.levelProgress;
			if (!progress?.size) return 'Level progress';
			const passed = `Passed SRS stages of the level's radicals and the kanji needed to level up: ${progress.passed} / ${progress.size} (${this.levelPercent.toFixed(1)}%)`;
			const change = this.todayChange;
			if (!change) return passed;
			return `${passed}\n${change.title}`;
		},
		/** The bar's change since today started: where it is on the bar, and how much (null: none). */
		todayChange() {
			if (!this.levelProgressKnown || !this.levelProgressBeforeToday) return null;
			return levelProgressChange(this.levelProgress, this.levelProgressBeforeToday);
		},
		/** Countdown is computed live: the cached summary's "time" string goes stale. */
		nextInfo() {
			const next = this.next;
			if (!next) return null;
			const at = next.dateTime ? new Date(next.dateTime) : null;
			const valid = at && !Number.isNaN(at.getTime());
			const delta = valid ? at.getTime() - this.now : null;

			return {
				count: next.reviews?.length ?? 0,
				time: delta == null
					? next.time
					: delta > 0 ? prettyTime(delta, { short: true, seconds: false }) || next.time : '',
				label: valid
					? at.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
					: [next.date, next.hours].filter(Boolean).join(', '),
			};
		},
	},

	watch: {
		levelPercent(value) {
			if (this.barReady) this.displayedPercent = value;
		},
		// the level-up may be noticed after Home is shown (fresh user info)
		level() {
			void this.maybeCelebrate();
		},
	},

	mounted() {
		void readPageHistory().then(entries => { this.pagesCount = entries.length; });
		this.stopWatchingPages = watchPageHistory(entries => { this.pagesCount = entries.length; });
		void this.maybeCelebrate();
		this.stopWatchingMilestones = watchMilestones(() => void this.maybeCelebrate());
		this.timer = setInterval(() => { this.now = Date.now(); }, 30 * 1000);
		// Paint the bar at 0 first, then set the real width so the CSS transition plays
		// (the value is often known instantly from the saved snapshot).
		requestAnimationFrame(() => requestAnimationFrame(() => {
			this.barReady = true;
			this.displayedPercent = this.levelPercent;
		}));
	},

	beforeUnmount() {
		clearInterval(this.timer);
		this.stopWatchingMilestones?.();
		this.stopWatchingPages?.();
	},

	methods: {
		async maybeCelebrate() {
			if (this.celebrating) return;
			const levelUp = await pendingCelebration();
			// only for the level shown (not one noticed before the user info here caught up)
			if (!levelUp || levelUp.to !== this.level || this.celebrating) return;
			// asked for less motion: it's just over (the toast still says it)
			if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
				await markCelebrated();
				return;
			}
			this.celebrating = true;
			await markCelebrated();
			await this.$nextTick();
			const confetti = this.$refs.confetti ? confettiBurst(this.$refs.confetti) : Promise.resolve();
			// the badge counts up (a few steps at most for a jump of many levels)
			const steps = Math.min(levelUp.to - levelUp.from, 4);
			for (let step = 0; step <= steps; step++) {
				this.displayedLevel = Math.round(levelUp.from + ((levelUp.to - levelUp.from) * step) / steps);
				await new Promise(resolve => setTimeout(resolve, LEVEL_STEP_MS));
			}
			this.displayedLevel = null;
			await confetti;
			this.celebrating = false;
		},
	},
};
</script>

<style scoped>
.home-hero {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 14px;
	background-color: var(--default-color);
	background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0));
	color: #fff;
	/* a standalone card, like the others on Home (not attached to the top edge) */
	border-radius: var(--card-radius, 12px);
	border: 1px solid rgba(255, 255, 255, 0.06);
	box-shadow: 0 4px 16px var(--shadow-soft-color);
}

/* Level, and the Friends button beside it */
/* the badge, centred beside the name / bar and the pills under them */
.hero-top {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	grid-template-areas:
		'badge info'
		'badge pills';
	align-items: center;
	column-gap: 12px;
	row-gap: 8px;
}

.hero-level {
	min-width: 0;
	display: flex;
	align-items: center;
	color: inherit;
}

/* a square, centred beside the name, bar and pills */
.hero-level-badge-link {
	grid-area: badge;
	align-self: center;
}

/* name and bar, then the bar's label and the level up's practice */
.hero-info {
	grid-area: info;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 5px;
}

.hero-pills {
	grid-area: pills;
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.hero-pill-word {
	font-weight: 600;
	color: #c4c6da;
}

/* a small pill: icon + count (friends, pages) */
.hero-friends {
	/* the pills share the row's whole width (as the bar above, to the practice button's end) */
	flex: 1 0 auto;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	padding: 3px 8px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.1);
	border: 1px solid rgba(255, 255, 255, 0.12);
	color: #fff;
	font-size: 11px;
	font-weight: 800;
	line-height: 1;
	transition: background-color 0.15s;
}

.hero-friends:hover {
	opacity: 1;
	background: rgba(255, 255, 255, 0.18);
}

/* something new to try (the pages history, while off) */
.hero-pill-new {
	width: 6px;
	height: 6px;
	margin-left: 1px;
	border-radius: 50%;
	background: var(--wanikani, #f100a1);
	box-shadow: 0 0 0 2px rgba(241, 0, 161, 0.25);
}

/* trouble subjects: the tiles' mark, in a pill */
.hero-trouble-mark {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 13px;
	height: 13px;
	border-radius: 50%;
	background: #f5a524;
	color: #2a1a00;
	font-size: 9.5px;
	font-weight: 900;
}

.hero-friends svg {
	width: 14px;
	height: 14px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
}

.hero-level:hover {
	opacity: 0.85;
}

.hero-level-badge {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 54px;
	height: 54px;
	flex-shrink: 0;
	border-radius: 14px;
	background: rgba(255, 255, 255, 0.1);
	border: 1px solid rgba(255, 255, 255, 0.12);
	line-height: 1;
}

.hero-confetti {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	z-index: 2;
	border-radius: inherit;
	pointer-events: none;
}

.hero-level-badge.celebrating {
	animation: hero-level-glow 1.2s ease-in-out 2;
}

/* each new number pops in */
.hero-level-badge.celebrating strong {
	animation: hero-level-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes hero-level-glow {
	50% {
		transform: scale(1.08);
		background: rgba(255, 255, 255, 0.22);
		box-shadow: 0 0 18px rgba(241, 0, 161, 0.6);
	}
}

@keyframes hero-level-pop {
	from {
		transform: translateY(8px) scale(0.6);
		opacity: 0;
	}
}

.hero-level-badge small {
	font-size: 9.5px;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: #c4c6da;
	margin-bottom: 3px;
}

.hero-level-badge strong {
	font-size: 22px;
}

.hero-level-info {
	display: flex;
	flex-direction: column;
	gap: 5px;
	flex: 1;
	min-width: 0;
}

.hero-username {
	font-size: 15px;
	font-weight: 700;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hero-progress-track {
	position: relative;
	display: block;
	height: 7px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.12);
	overflow: hidden;
}

.hero-progress-fill {
	display: block;
	height: 100%;
	border-radius: 999px;
	background: linear-gradient(90deg, var(--wanikani-sec), var(--wanikani));
	transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

/* today's part of the bar: appears once the bar has grown to its place */
.hero-progress-today {
	position: absolute;
	top: 0;
	bottom: 0;
	box-sizing: border-box;
	opacity: 0;
	transition: opacity 0.3s ease 0.7s;
}

.hero-progress-today.shown {
	opacity: 1;
}

.hero-progress-today.gain {
	border-radius: 0 999px 999px 0;
	background: #5bd68f;
}

/* lost today: what it was, see-through and dotted (as in the review summary) */
.hero-progress-today.loss {
	border: 1px dotted #ff7a7e;
	border-radius: 0 999px 999px 0;
	background: rgba(255, 122, 126, 0.12);
}

.hero-name-row {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 8px;
	min-width: 0;
}

.hero-progress-today-label {
	flex-shrink: 0;
	font-size: 11px;
	font-weight: 700;
	white-space: nowrap;
}

.hero-progress-today-label.gain {
	color: #5bd68f;
}

.hero-progress-today-label.loss {
	color: #ff7a7e;
}

@media (prefers-reduced-motion: reduce) {
	.hero-progress-fill,
	.hero-progress-today {
		transition: none;
	}
}

.hero-progress-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	min-height: 18px;
}

.hero-progress-label {
	min-width: 0;
	overflow: hidden;
	font-size: 11px;
	color: #c4c6da;
	text-decoration: none;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.hero-progress-label:hover {
	opacity: 0.85;
}

/* the level up's practice: a small green pill at the label's end */
.hero-levelup {
	flex-shrink: 0;
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 8px 2px 6px;
	border: 1px solid rgba(110, 207, 138, 0.4);
	border-radius: 999px;
	background: rgba(110, 207, 138, 0.14);
	color: #8fe0a6;
	font-size: 11px;
	font-weight: 800;
	line-height: 1.3;
	text-decoration: none;
	white-space: nowrap;
	transition: background-color 0.12s, border-color 0.12s;
}

.hero-levelup:hover {
	background: rgba(110, 207, 138, 0.26);
	border-color: rgba(110, 207, 138, 0.7);
}

.hero-levelup svg {
	width: 10px;
	height: 10px;
	fill: currentColor;
}

/* Lessons / Reviews */
.hero-actions {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 10px;
}

.hero-action {
	display: flex;
	flex-direction: column;
	border-radius: 12px;
	overflow: hidden;
	color: #fff;
	box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.18);
}

.hero-action-main {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 12px 8px 8px;
	color: #fff;
	transition: filter 0.15s ease;
}

.hero-action-main:hover {
	opacity: 1;
	filter: brightness(1.1);
}

/* opens the real lesson / review session on wanikani.com */
.hero-action-external {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	padding: 6px 8px 8px;
	background: rgba(0, 0, 0, 0.16);
	color: #fff;
	font-size: 11px;
	font-weight: 700;
	transition: background-color 0.15s ease;
}

.hero-action-external:hover {
	opacity: 1;
	background: rgba(0, 0, 0, 0.3);
}

.hero-action-external span {
	font-size: 10px;
	opacity: 0.85;
}

/* none to do: a note, not a link */
.hero-action-external.done {
	color: rgba(255, 255, 255, 0.85);
	font-weight: 600;
	cursor: default;
}

.hero-action-external.done:hover {
	background: rgba(0, 0, 0, 0.16);
}

.hero-action.lessons {
	background: var(--wanikani);
}

.hero-action.reviews {
	background: var(--wanikani-sec);
}

.hero-action-count {
	font-size: 30px;
	font-weight: 700;
	line-height: 1.05;
}

.hero-action-label {
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	opacity: 0.92;
}

/* Next reviews */
.hero-next {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.07);
	color: #e6e7f2;
	font-size: 12px;
}

.hero-next:hover {
	opacity: 1;
	background: rgba(255, 255, 255, 0.11);
}

.hero-next b {
	color: #fff;
}

.hero-next-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--wanikani-sec);
	box-shadow: 0 0 0 3px rgba(0, 170, 255, 0.25);
	flex-shrink: 0;
}

.hero-next-when {
	margin-left: auto;
	color: #b3b6cc;
	white-space: nowrap;
}

.hero-next-empty {
	color: #b3b6cc;
}
</style>
