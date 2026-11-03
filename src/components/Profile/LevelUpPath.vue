<template>
	<!-- the fastest level up (its time as the header), and the kanji it counts on: when each can
	     reach Guru, and how late it can be -->
	<div class="level-up-path" :class="{ open, now: canLevelUpNow }">
		<div v-if="canLevelUpNow" class="level-up-path-toggle" :title="title">
			<span class="level-up-path-head">
				<span class="level-up-path-title">You can level up <b>now</b>! Go do your reviews!</span>
			</span>
		</div>
		<button
			v-else
			type="button"
			class="level-up-path-toggle"
			:aria-expanded="open"
			:disabled="!path.length"
			:title="title"
			@click="open = !open"
		>
			<span class="level-up-path-head">
				<span class="level-up-path-line">
					<span class="level-up-path-title" :title="readable">Level up in <b>{{ shortReadable }}</b></span>
					<span class="level-up-path-date">{{ dateLabel }}</span>
				</span>
				<span class="level-up-path-sub">
					{{ path.length }} kanji to Guru<template v-if="lockedKanji"> · {{ lockedKanji }} not unlocked yet</template><template v-if="criticalCount"> · <b class="critical-text">{{ criticalCount }} critical</b></template>
				</span>
			</span>
			<svg v-if="path.length" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
		</button>

		<div v-if="open && !canLevelUpNow" class="level-up-path-body">
			<p class="level-up-path-note">
				Every kanji answered right as soon as it's due.
				<template v-if="spare">{{ spare }} of the level's kanji aren't needed: they can be late.</template>
			</p>
			<div class="level-up-path-list">
				<RouterLink
					v-for="entry in rows"
					:key="entry.id"
					:to="{ name: 'Subject', params: { id: entry.id } }"
					class="path-row"
					:class="{ critical: entry.critical }"
				>
					<span class="path-kanji" :style="{ background: entry.color }" lang="ja">{{ entry.characters }}</span>
					<span class="path-info">
						<span class="path-next">{{ entry.next }}</span>
						<span class="path-stage">{{ entry.stage }}</span>
					</span>
					<span class="path-when">
						<span class="path-guru">Guru {{ entry.guru }}</span>
						<span v-if="entry.critical" class="path-tag critical">Critical</span>
						<span v-else class="path-tag" :title="entry.slackTitle">{{ entry.slack }}</span>
					</span>
				</RouterLink>
			</div>
		</div>
	</div>
</template>

<script>
import { RouterLink } from 'vue-router';
import { srsStages } from '@/utils/scripts/wanikani';
import { prettyTime } from '@/utils/scripts/time';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Today 14:00", "Tomorrow 09:00", "Fri 10:00", "12 Mar 10:00" */
function when(time, now = Date.now()) {
	const date = new Date(time);
	const clock = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	const days = Math.round((new Date(date).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / DAY_MS);
	if (days <= 0) return `today ${clock}`;
	if (days === 1) return `tomorrow ${clock}`;
	if (days < 7) return `${date.toLocaleDateString(undefined, { weekday: 'short' })} ${clock}`;
	return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${clock}`;
}

export default {
	name: 'LevelUpPath',

	components: { RouterLink },

	props: {
		/** getLevelUpPrediction's path: latest Guru first */
		path: { type: Array, default: () => [] },
		spare: { type: Number, default: 0 },
		/** how long until the fastest level up ("6 days, 15 hours, 59 minutes") */
		readable: { type: String, default: '' },
		levelUpAt: { type: Date, default: null },
		canLevelUpNow: { type: Boolean, default: false },
		/** of the kanji it counts on, how many aren't unlocked yet */
		lockedKanji: { type: Number, default: 0 },
		/** what the prediction assumes (the header's tooltip) */
		title: { type: String, default: '' },
	},

	data() {
		return { open: false };
	},

	computed: {
		/**
		 * The two biggest units only ("6 days, 15 hours", "15 hours, 48 minutes"), so the header
		 * stays on one line; the full time in its tooltip.
		 */
		shortReadable() {
			if (!this.levelUpAt) return this.readable;
			const ms = Math.max(0, this.levelUpAt.getTime() - Date.now());
			const units = [
				[Math.floor(ms / DAY_MS), 'day'],
				[Math.floor(ms / 3_600_000) % 24, 'hour'],
				[Math.floor(ms / 60_000) % 60, 'minute'],
			];
			const first = units.findIndex(([value]) => value > 0);
			if (first < 0) return 'under a minute';
			return units.slice(first, first + 2)
				.filter(([value]) => value > 0)
				.map(([value, unit]) => `${value} ${unit}${value === 1 ? '' : 's'}`)
				.join(', ');
		},
		/** "Fri 6 Nov, 15:00" */
		dateLabel() {
			if (!this.levelUpAt) return '';
			return this.levelUpAt.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
		},
		criticalCount() {
			return this.path.filter(entry => entry.critical).length;
		},
		rows() {
			const now = Date.now();
			return this.path.map(entry => {
				const subject = entry.subject;
				const stage = subject.assignment?.srs_stage ?? 0;
				const availableAt = subject.assignment?.available_at ? Date.parse(subject.assignment.available_at) : NaN;
				let next;
				if (entry.locked) next = entry.unlockAt ? `Unlocks ${when(entry.unlockAt, now)}` : 'Locked';
				else if (stage === 0) next = 'Lesson available';
				else if (!Number.isFinite(availableAt) || availableAt <= now) next = 'Review now';
				else next = `Review ${when(availableAt, now)}`;
				return {
					id: subject.id,
					characters: subject.characters,
					color: entry.locked ? '#8a8fa3' : srsStages[stage]?.color ?? '#8a8fa3',
					stage: entry.locked ? 'Locked' : srsStages[stage]?.name ?? '',
					next,
					guru: entry.time <= now ? 'now' : when(entry.time, now),
					critical: entry.critical,
					slack: entry.slackMs >= 60 * 60 * 1000
						? `${prettyTime(entry.slackMs, { seconds: false, minutes: false })} spare`
						: 'Covered',
					slackTitle: entry.slackMs >= 60 * 60 * 1000
						? 'How much later it can reach Guru without moving the level up'
						: 'No time to spare, but a kanji not needed is ready by then to take its place',
				};
			});
		},
	},
};
</script>

<style scoped>
/* in the dark header, as the level card above */
.level-up-path {
	margin: 0 15px 6px;
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-radius: var(--card-radius, 12px);
	background: rgba(255, 255, 255, 0.05);
	color: #fff;
	overflow: hidden;
}

.level-up-path-toggle {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	padding: 10px 14px;
	border: none;
	background: transparent;
	color: inherit;
	font-family: inherit;
	text-align: left;
	cursor: pointer;
	transition: background-color 0.15s;
}

.level-up-path-toggle:not(:disabled):not(div):hover {
	background: rgba(255, 255, 255, 0.05);
}

.level-up-path-toggle:disabled,
div.level-up-path-toggle {
	cursor: default;
}

/* the time on the left, its date on the right; what it counts on under them */
.level-up-path-head {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.level-up-path-line {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 8px;
}

.level-up-path-title {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 13px;
	color: rgba(255, 255, 255, 0.8);
}

/* level up now: the message may wrap */
.now .level-up-path-title {
	white-space: normal;
}

.level-up-path-title b {
	color: #fff;
}

.level-up-path-date {
	flex-shrink: 0;
	font-size: 12px;
	font-weight: 700;
	color: #fff;
	font-variant-numeric: tabular-nums;
}

.level-up-path-sub {
	font-size: 11.5px;
	color: rgba(255, 255, 255, 0.6);
}

/* level up now: just the message, centred */
.now .level-up-path-head {
	align-items: center;
}

.critical-text {
	color: #ff8a8a;
}

.level-up-path-toggle svg {
	width: 16px;
	height: 16px;
	fill: none;
	stroke: rgba(255, 255, 255, 0.6);
	stroke-width: 2.5;
	stroke-linecap: round;
	stroke-linejoin: round;
	transition: transform 0.15s;
}

.open .level-up-path-toggle svg {
	transform: rotate(180deg);
}

.level-up-path-body {
	border-top: 1px solid rgba(255, 255, 255, 0.08);
	padding: 8px 8px 6px;
}

.level-up-path-note {
	margin: 0 6px 6px;
	font-size: 11px;
	color: rgba(255, 255, 255, 0.55);
}

.level-up-path-list {
	max-height: 250px;
	overflow: auto;
}

.path-row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 5px 6px;
	border-radius: 8px;
	color: inherit;
	text-decoration: none;
	transition: background-color 0.15s;
}

.path-row:hover {
	opacity: 1;
	background: rgba(255, 255, 255, 0.07);
}

.path-kanji {
	flex-shrink: 0;
	width: 30px;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 7px;
	font-size: 17px;
	color: #fff;
}

.path-row.critical .path-kanji {
	box-shadow: 0 0 0 2px #ff6b6b;
}

.path-info,
.path-when {
	display: flex;
	flex-direction: column;
	min-width: 0;
	line-height: 1.25;
}

.path-info {
	flex: 1;
}

.path-next {
	font-size: 12.5px;
	font-weight: 700;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.path-stage {
	font-size: 10.5px;
	color: rgba(255, 255, 255, 0.55);
}

.path-when {
	align-items: flex-end;
	flex-shrink: 0;
}

.path-guru {
	font-size: 11.5px;
	color: rgba(255, 255, 255, 0.8);
	white-space: nowrap;
}

.path-tag {
	margin-top: 2px;
	padding: 0 6px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.12);
	color: rgba(255, 255, 255, 0.75);
	font-size: 9.5px;
	font-weight: 700;
	line-height: 15px;
	white-space: nowrap;
}

.path-tag.critical {
	background: #e5484d;
	color: #fff;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}
</style>
