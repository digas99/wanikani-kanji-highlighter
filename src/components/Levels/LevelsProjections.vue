<template>
	<!-- when you'd reach level 60, each JLPT level and Jōyō grade, at your pace or the fastest -->
	<section class="projections">
		<header class="projections-head">
			<span class="projections-title">Projections</span>
			<InfoTip class="projections-info" label="How JLPT and Jōyō are counted">
				JLPT and Jōyō: 80% of the kanji and 70% of the words passed, with the easier ones' (as on the JLPT &amp; Jōyō page). Only kanji and words: not grammar, reading or listening.
			</InfoTip>
			<div class="projections-pace" role="radiogroup" aria-label="Pace">
				<button
					type="button"
					role="radio"
					:aria-checked="pace === 'yours'"
					:class="{ active: pace === 'yours' }"
					:disabled="!yourPace"
					:title="yourPace ? `The median of your last levels: ${formatDays(yourPace)} each` : 'No passed levels yet'"
					@click="setPace('yours')"
				>Your pace</button>
				<button
					type="button"
					role="radio"
					:aria-checked="pace === 'fastest'"
					:class="{ active: pace === 'fastest' }"
					:title="`The fastest possible: about ${formatDays(FASTEST_LEVEL_DAYS)} a level`"
					@click="setPace('fastest')"
				>Fastest</button>
				<button
					type="button"
					role="radio"
					:aria-checked="pace === 'custom'"
					:class="{ active: pace === 'custom' }"
					title="Your own number of days a level"
					@click="setPace('custom')"
				>Custom</button>
			</div>
		</header>
		<!-- custom: the days a level, the projections following as it changes -->
		<div v-if="pace === 'custom'" class="projections-custom">
			<input
				:value="customDays"
				type="range"
				:min="CUSTOM_MIN"
				:max="CUSTOM_MAX"
				step="1"
				aria-label="Days a level"
				@input="setCustomDays($event.target.value)"
			/>
			<label class="projections-custom-number">
				<input
					:value="customDays"
					type="number"
					:min="CUSTOM_MIN"
					:max="CUSTOM_LIMIT"
					step="0.5"
					inputmode="decimal"
					:title="`Up to ${CUSTOM_LIMIT} days`"
					@input="setCustomDays($event.target.value, $event)"
				/>
				days a level
			</label>
		</div>
		<p v-else class="projections-sub">
			{{ formatDays(paceDays) }} a level<template v-if="pace === 'yours'"> (the median of your last levels)</template>
		</p>

		<p v-if="!ready" class="projections-empty">Loading subjects…</p>
		<div v-else class="projections-groups">
			<div v-for="group in groups" :key="group.name" class="projections-group">
				<div class="projections-group-name">{{ group.name }}</div>
				<div
					v-for="row in group.rows"
					:key="row.key"
					class="projection-row"
					:class="row.state"
					:title="row.title"
				>
					<span class="projection-label">{{ row.label }}</span>
					<span class="projection-level">{{ row.levelLabel }}</span>
					<span class="projection-when">
						<template v-if="row.state === 'done'">
							<span class="projection-check" aria-hidden="true">✓</span> There
						</template>
						<template v-else-if="row.state === 'close'">Finishing</template>
						<template v-else-if="row.state === 'never'">Not with WK alone</template>
						<template v-else>
							<b>{{ row.date }}</b>
							<small>{{ row.inLabel }}</small>
						</template>
					</span>
				</div>
			</div>
		</div>
	</section>
</template>

<script>
import { useWKStore } from '@/stores';
import { getLevelStatsEntries } from '@/utils/scripts/levelStats';
import InfoTip from '@/components/InfoTip.vue';
import {
	FASTEST_LEVEL_DAYS,
	etaForLevel,
	projectionTargets,
	readCustomPaceDays,
	readProjectionPace,
	recentPaceDays,
	saveCustomPaceDays,
	saveProjectionPace,
} from '@/utils/scripts/projections';

const DAY_MS = 24 * 60 * 60 * 1000;
/** custom pace: from the fastest possible; the slider up to half a year, the box up to a year */
const CUSTOM_MIN = 7;
const CUSTOM_MAX = 180;
const CUSTOM_LIMIT = 365;

export default {
	name: 'LevelsProjections',

	components: { InfoTip },

	data() {
		return {
			FASTEST_LEVEL_DAYS,
			CUSTOM_MIN,
			CUSTOM_MAX,
			CUSTOM_LIMIT,
			pace: readProjectionPace(),
			/** custom: what's typed (may be empty mid-edit); starts from your pace */
			customDays: readCustomPaceDays() == null ? null : Math.min(CUSTOM_LIMIT, readCustomPaceDays()),
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		ready() {
			return this.wk.allSubjectsInMemory && Boolean(this.wk.userInfo?.level);
		},
		yourPace() {
			return recentPaceDays(this.wk.levelsStats);
		},
		paceDays() {
			if (this.pace === 'custom') {
				const days = Number(this.customDays);
				// nothing faster than the fastest possible
				return Number.isFinite(days) && days > 0
					? Math.min(CUSTOM_LIMIT, Math.max(FASTEST_LEVEL_DAYS, days))
					: FASTEST_LEVEL_DAYS;
			}
			return this.pace === 'yours' && this.yourPace ? this.yourPace : FASTEST_LEVEL_DAYS;
		},
		targets() {
			return this.ready ? projectionTargets(this.wk.allSubjects) : [];
		},
		groups() {
			const currentLevel = this.wk.userInfo?.level ?? 1;
			const latest = getLevelStatsEntries(this.wk.levelsStats, currentLevel)[0];
			const options = {
				currentLevel,
				onLevelSince: latest?.unlocked_at ? Date.parse(latest.unlocked_at) : null,
				paceDays: this.paceDays,
				// the fastest pace: the current level's own prediction
				fastestLevelUpAt: this.wk.fastestLevelUp?.level === currentLevel ? this.wk.fastestLevelUp.at : null,
			};
			const now = Date.now();
			const groups = [];
			for (const target of this.targets) {
				let group = groups.find(entry => entry.name === target.group);
				if (!group) groups.push(group = { name: target.group, rows: [] });
				const row = { key: target.key, label: target.label, levelLabel: '', state: 'future', title: '' };
				if (target.level === 0) {
					row.state = 'done';
					row.title = 'Already passed enough of it';
				} else if (!Number.isFinite(target.level)) {
					row.state = 'never';
					row.title = 'WaniKani doesn\'t teach enough of it';
				} else if (target.level <= currentLevel) {
					row.state = 'close';
					row.levelLabel = 'your levels';
					row.title = 'Taught in the levels you\'ve reached: passing what\'s still in Apprentice gets you there';
				} else {
					const at = etaForLevel(target.level, options);
					row.levelLabel = target.key === 'wk60' ? '' : `at level ${target.level}`;
					row.date = new Date(at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
					row.inLabel = this.inLabel(at - now);
					const day = new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
					// level 60 passed: there's no level 61 to be "on"
					row.title = target.key === 'wk60'
						? `Level 60 passed around ${day}`
						: `On level ${target.level} around ${day}`;
				}
				group.rows.push(row);
			}
			return groups;
		},
	},

	mounted() {
		void this.wk.refreshFastestLevelUp();
	},

	methods: {
		setPace(pace) {
			this.pace = pace;
			saveProjectionPace(pace);
			// first time: start from your pace, rounded
			if (pace === 'custom' && this.customDays == null) {
				this.setCustomDays(Math.round(Math.min(CUSTOM_MAX, this.yourPace ?? 14)));
			}
		},
		setCustomDays(value, event) {
			let days = Number(value);
			// over the cap: brought back to it, in the box too
			if (days > CUSTOM_LIMIT) {
				days = CUSTOM_LIMIT;
				if (event?.target) event.target.value = String(CUSTOM_LIMIT);
			}
			// mid-edit (empty): kept as typed, the last good value stays saved
			this.customDays = value === '' ? '' : days;
			if (Number.isFinite(days) && days > 0) saveCustomPaceDays(days);
		},
		formatDays(days) {
			return `${days.toFixed(days < 10 ? 1 : 0)} days`;
		},
		inLabel(ms) {
			const days = ms / DAY_MS;
			if (days < 14) return `in ${Math.max(1, Math.round(days))} days`;
			if (days < 60) return `in ${Math.round(days / 7)} weeks`;
			if (days < 730) return `in ${Math.round(days / 30.4)} months`;
			return `in ${(days / 365).toFixed(1)} years`;
		},
	},
};
</script>

<style scoped>
/* as the Levels card */
.projections {
	padding: 12px;
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	border-radius: var(--card-radius, 12px);
	box-shadow: 0 2px 10px var(--shadow-soft-color);
}

.projections-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.projections-title {
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

.projections-pace {
	display: flex;
	gap: 2px;
	padding: 2px;
	border-radius: 8px;
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
}

.projections-pace button {
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

.projections-pace button:disabled {
	opacity: 0.4;
	cursor: default;
}

.projections-pace button.active {
	background: var(--pill-color, #e36f94);
	color: #fff;
}

.projections-sub {
	margin: 6px 2px 8px;
	font-size: 11.5px;
	color: var(--font-sec-color);
}

/* custom pace: a slider and the number, on the sub-line's place */
.projections-custom {
	display: flex;
	align-items: center;
	gap: 10px;
	margin: 6px 2px 8px;
}

.projections-custom input[type='range'] {
	flex: 1;
	min-width: 0;
	/* not the text inputs' box */
	margin: 0;
	padding: 0;
	border: none;
	background: transparent;
	box-shadow: none;
	accent-color: var(--pill-color, #e36f94);
}

.projections-custom-number {
	display: flex;
	align-items: center;
	gap: 6px;
	flex-shrink: 0;
	font-size: 11.5px;
	color: var(--font-sec-color);
}

.projections-custom-number input {
	width: 58px;
	padding: 3px 6px;
	border: 1px solid var(--surface-border-color);
	border-radius: 6px;
	background: var(--fill-color);
	color: var(--font-color);
	font-family: inherit;
	font-size: 12px;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	text-align: right;
}

.projections-empty {
	padding: 16px;
	text-align: center;
	color: var(--font-sec-color);
}

.projections-groups {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.projections-group {
	border: 1px solid var(--surface-border-color);
	border-radius: 10px;
	overflow: hidden;
}

.projections-group-name {
	padding: 4px 10px;
	background: var(--default-color);
	color: #fff;
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.projection-row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 10px;
	background: color-mix(in srgb, var(--default-color) 4%, var(--fill-color));
}

.projection-row + .projection-row {
	border-top: 1px solid var(--surface-border-color);
}

.projection-label {
	flex: 0 0 auto;
	min-width: 72px;
	font-size: 13px;
	font-weight: 700;
	color: var(--heading-color, #2a2d48);
}

.projection-level {
	flex: 1;
	font-size: 11px;
	color: var(--font-sec-color);
}

.projection-when {
	display: flex;
	align-items: baseline;
	gap: 6px;
	font-size: 12px;
	color: var(--font-sec-color);
	white-space: nowrap;
}

.projection-when b {
	color: var(--font-color);
	font-variant-numeric: tabular-nums;
}

.projection-when small {
	font-size: 11px;
}

.projection-row.done .projection-when {
	color: #30a46c;
	font-weight: 700;
}

.projection-row.close .projection-when {
	color: var(--wanikani-sec, #00aaff);
	font-weight: 700;
}

.projection-row.done .projection-label,
.projection-row.never .projection-label {
	opacity: 0.7;
}

.projections-info {
	flex-shrink: 0;
	margin-right: auto;
	color: var(--font-sec-color);
}
</style>
