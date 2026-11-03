<template>
	<!-- Today, inside the Home hero card (it's always dark: colors are fixed) -->
	<div class="hero-today">
		<div class="hero-today-head">
			<span class="hero-today-label">Today</span>
			<span v-if="syncing" class="hero-today-spinner" title="Checking with WaniKani" aria-hidden="true"></span>
			<button
				v-if="summary?.trackedFrom"
				type="button"
				class="hero-today-info"
				:class="{ open: noteOpen }"
				:title="noteText"
				:aria-expanded="noteOpen"
				aria-label="Why some reviews aren't scored"
				@click="noteOpen = !noteOpen"
			>!</button>
		</div>

		<p v-if="!summary" class="hero-today-muted">Gathering today's activity…</p>
		<p v-else-if="isEmpty" class="hero-today-muted">No reviews or lessons yet today.</p>

		<div v-else class="hero-today-tiles">
			<!-- opens the list of today's reviewed subjects, by result -->
			<RouterLink
				v-if="summary.items"
				class="hero-today-tile hero-today-link"
				:to="{ name: 'Reviewed', query: { date: summary.date } }"
				:title="`${reviewsTitle}\nClick to see the subjects.`"
			>
				<b>{{ reviewCount }}{{ summary.unscored ? '+' : '' }}</b>
				<span>{{ reviewCount === 1 ? 'review' : 'reviews' }} ›</span>
			</RouterLink>
			<div v-else class="hero-today-tile">
				<b>0</b>
				<span>reviews</span>
			</div>

			<div class="hero-today-tile" :title="accuracyTitle">
				<b :class="accuracy != null && accuracyClass">{{ accuracy == null ? '–' : `${accuracy}%` }}</b>
				<span>correct</span>
			</div>

			<div class="hero-today-tile">
				<b>{{ summary.lessons }}</b>
				<span>{{ summary.lessons === 1 ? 'lesson' : 'lessons' }}</span>
			</div>

			<!-- hover (or click to keep them) for the moves on Progress overview's tiles -->
			<button
				v-if="summary.up || summary.down"
				type="button"
				class="hero-today-tile hero-today-link hero-today-moves"
				:class="{ pinned: movesPinned }"
				:title="movesTitle"
				:aria-pressed="movesPinned"
				@mouseenter="movesHovered = true"
				@mouseleave="movesHovered = false"
				@click="movesPinned = !movesPinned"
			>
				<b>
					<template v-if="summary.up"><span class="arrow up">↑</span>{{ summary.up }}</template>
					<template v-if="summary.down"><span class="arrow down">↓</span>{{ summary.down }}</template>
				</b>
				<span>SRS stages</span>
			</button>

			<div v-if="summary.passed" class="hero-today-tile" title="Passed today (reached Guru for the first time)">
				<b>{{ summary.passed }}</b>
				<span>passed</span>
			</div>

			<div v-if="summary.burned" class="hero-today-tile" title="Burned today">
				<b>{{ summary.burned }}</b>
				<span>burned</span>
			</div>
		</div>

		<p v-if="noteOpen && summary?.trackedFrom" class="hero-today-note">{{ noteText }}</p>
	</div>
</template>

<script>
import { RouterLink } from 'vue-router';

export default {
	name: 'TodayActivity',

	components: {
		RouterLink,
	},

	props: {
		/** DaySummary (utils/scripts/dailyActivity), null while the first sync runs */
		summary: {
			type: Object,
			default: null,
		},
		syncing: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		return {
			noteOpen: false,
			movesHovered: false,
			movesPinned: false,
		};
	},

	/** show-moves(shown): the SRS moves on Progress overview's tiles; reveal-moves: scroll to them (a click) */
	emits: ['show-moves', 'reveal-moves'],

	watch: {
		showMoves(shown) {
			this.$emit('show-moves', shown);
		},
		movesPinned(pinned) {
			if (pinned) this.$emit('reveal-moves');
		},
	},

	deactivated() {
		this.movesHovered = false;
		this.movesPinned = false;
	},

	computed: {
		isEmpty() {
			const { reviews, items, lessons, passed, burned } = this.summary;
			return !reviews && !items && !lessons && !passed && !burned;
		},
		/** subjects reviewed before tracking started count once each (at least one review) */
		reviewCount() {
			return this.summary.reviews + (this.summary.unscored ?? 0);
		},
		reviewsTitle() {
			if (!this.summary.unscored) return 'Finished reviews today';
			return `At least ${this.reviewCount}: ${this.summary.unscored} ${this.summary.unscored === 1 ? 'subject was' : 'subjects were'} reviewed before tracking started.`;
		},
		answered() {
			return this.summary.correct + this.summary.incorrect;
		},
		accuracy() {
			return this.answered ? Math.round((this.summary.correct / this.answered) * 100) : null;
		},
		/** Per answer (retries included), so lower than WaniKani's per-item score: 80% is a good day. */
		accuracyClass() {
			if (this.accuracy >= 80) return 'good';
			if (this.accuracy >= 60) return '';
			return 'low';
		},
		accuracyTitle() {
			if (!this.answered && this.summary.unscored) return 'Reviews done before tracking started can\'t be scored. This fills in from your next review.';
			if (!this.answered) return 'No scored answers yet';
			return `${this.summary.correct} of ${this.answered} answers correct. Meaning and reading count as separate answers, and retries count too, so this differs from WaniKani's per-item score.`;
		},
		movesTitle() {
			const { up, down } = this.summary;
			return `Reviewed subjects that moved up (${up}) or down (${down}) an SRS stage.\n${this.movesPinned ? 'Click to hide' : 'Hover, or click to keep,'} the moves on Progress overview.`;
		},
		showMoves() {
			return Boolean((this.movesHovered || this.movesPinned) && (this.summary?.up || this.summary?.down));
		},
		noteText() {
			const { unscored, trackedFrom } = this.summary;
			const time = new Date(trackedFrom).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			return `Tracking started at ${time}. ${unscored} ${unscored === 1 ? 'review' : 'reviews'} before that ${unscored === 1 ? 'is' : 'are'} counted but can't be scored: WaniKani only shares running totals of right and wrong answers, so scoring needs the totals from before each review. From tomorrow, every review is scored.`;
		},
	},
};
</script>

<style scoped>
.hero-today {
	padding: 6px 8px 8px;
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.07);
	color: #e6e7f2;
	font-size: 12px;
}

.hero-today-head {
	display: flex;
	align-items: center;
	gap: 8px;
	/* a slim label row: the (!) and the spinner fit its height */
	height: 15px;
	margin-bottom: 5px;
	line-height: 1;
}

.hero-today-label {
	flex: 1;
	font-size: 10px;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: #b3b6cc;
}

.hero-today-muted {
	margin: 0;
	color: #b3b6cc;
}

/* small squares in one row, each as wide as it needs (a grid's equal columns
   pushed the last one alone to a second row when one tile, ↑25 ↓23, was wider) */
.hero-today-tiles {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.hero-today-tile {
	flex: 1 1 auto;
	min-width: 50px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 1px;
	min-width: 0;
	padding: 6px 6px 5px;
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(255, 255, 255, 0.08);
	color: inherit;
	text-decoration: none;
}

.hero-today-tile b {
	font-size: 16px;
	line-height: 1.15;
	color: #fff;
	white-space: nowrap;
}

.hero-today-tile span {
	font-size: 10px;
	font-weight: 700;
	color: #b3b6cc;
	white-space: nowrap;
}

.hero-today-link {
	cursor: pointer;
	transition: background-color 0.15s, border-color 0.15s;
}

.hero-today-link:hover {
	opacity: 1;
	background: rgba(255, 255, 255, 0.14);
	border-color: rgba(255, 255, 255, 0.25);
}

/* a button like the other tiles */
.hero-today-moves {
	font-family: inherit;
	font-size: inherit;
	cursor: pointer;
}

.hero-today-moves.pinned {
	background: rgba(255, 255, 255, 0.16);
	border-color: rgba(255, 255, 255, 0.55);
}

.hero-today-tile b .arrow {
	font-size: inherit;
	font-weight: 700;
}

.hero-today-tile b.good,
.hero-today-tile b .arrow.up {
	color: #5bd68f;
}

.hero-today-tile b.low {
	color: #f5c451;
}

.hero-today-tile b.low,
.hero-today-tile b .arrow.down {
	color: #ff7a7e;
}

.hero-today-tile b .arrow.down {
	margin-left: 5px;
}

.hero-today-spinner {
	flex-shrink: 0;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	border: 2px solid rgba(255, 255, 255, 0.2);
	border-top-color: var(--wanikani-sec);
	animation: hero-today-spin 0.8s linear infinite;
}

@keyframes hero-today-spin {
	to {
		transform: rotate(360deg);
	}
}

/* (!) — hover for the tooltip, click to read it inline */
.hero-today-info {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 15px;
	height: 15px;
	padding: 0;
	border-radius: 50%;
	border: 1.5px solid #f5c451;
	background: transparent;
	color: #f5c451;
	font-family: inherit;
	font-size: 10px;
	font-weight: 800;
	line-height: 1;
	cursor: pointer;
	transition: background-color 0.15s, color 0.15s;
}

.hero-today-info:hover,
.hero-today-info.open {
	background: #f5c451;
	color: var(--default-color, #2a2d48);
}

.hero-today-note {
	margin: 8px 0 0;
	font-size: 11px;
	line-height: 1.45;
	color: #c4c6da;
}
</style>
