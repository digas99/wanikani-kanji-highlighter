<template>
	<div class="container profile">
		<div class="levels-chooser-wrapper">
			<!-- first: a tile each (icon, value, what it is), like a toolbar -->
			<div class="profile-stats">
				<RouterLink :to="{ name: 'Accolades' }" class="profile-stat" title="Accolades">
					<img v-if="latestAccolade" :src="latestAccolade.image" alt="" class="profile-stat-icon" />
					<svg v-else viewBox="0 0 24 24" class="profile-stat-icon" aria-hidden="true">
						<circle cx="12" cy="9" r="5" /><path d="M8.5 13l-1.5 8 5-2.5 5 2.5-1.5-8" />
					</svg>
					<span class="profile-stat-text">
						<b>{{ accoladeTotals.unlocked }}/{{ accoladeTotals.total }}</b>
						<small>Accolades</small>
					</span>
				</RouterLink>
				<RouterLink :to="{ name: 'Friends' }" class="profile-stat" title="Compare levels with friends">
					<svg viewBox="0 0 24 24" class="profile-stat-icon" aria-hidden="true">
						<circle cx="9" cy="8" r="3.2" /><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
						<circle cx="17" cy="9" r="2.6" /><path d="M15.8 13.7c2.9.2 5.2 2.2 5.2 5" />
					</svg>
					<span class="profile-stat-text">
						<b>{{ friendCount }}</b>
						<small>{{ friendCount === 1 ? 'Friend' : 'Friends' }}</small>
					</span>
				</RouterLink>
				<!-- about which JLPT level your kanji and words are at (an estimate, not "ready to pass") -->
				<RouterLink :to="{ name: 'School', query: { school: 'jlpt' } }" class="profile-stat" :title="jlptTitle">
					<span class="profile-stat-icon profile-stat-jlpt" aria-hidden="true">JLPT</span>
					<span class="profile-stat-text">
						<b v-if="jlpt.ready">≈ {{ jlpt.ready }}</b>
						<b v-else-if="jlpt.next">{{ jlpt.next.label }} {{ jlptNextPercent }}%</b>
						<b v-else>–</b>
						<small>Kanji &amp; vocab</small>
					</span>
				</RouterLink>
			</div>
			<div class="levels-chooser-cover"></div>
			<!-- the picture on the left, over the banner; the name (its edit at the right) and when
			     you started beside it, under the banner -->
			<div class="profile-head">
			<div id="profile-pic">
				<a target="_blank" :href="userInfo?.profile_url" :title="userInfo?.profile_url">
					<img :src="userAvatar" alt="Profile Picture" />
				</a>
			</div>
			<div class="profile-info">
				<div class="profile-name">
					<span id="username">{{ userInfo?.username }}</span>
					<a id="edit" href="https://www.wanikani.com/settings/account"
						title="Edit your WaniKani account" target="_blank"><img
							src="@/assets/icons/profile/edit.png" alt="Edit"></a>
				</div>
				<div id="started">Started at {{ userInfo?.started_at?.split("T")[0] }}</div>
			</div>
			</div>
			<div class="levels-chooser" ref="levelsChooser">
				<div class="levels-chooser-small-level" style="left: -85px;">{{ beforePreviousLevel }}</div>
				<span title="Previous" @mouseover="toggleLevelToTheSide('left', true)"
					@mouseleave="toggleLevelToTheSide('left', false)" @click="changeLevel(previousLevel)">
					<div>{{ previousLevel }}</div>
				</span>
				<span title="Current">
					<div class="levels-chooser-current" title="Pick a level" @click="levelPickerOpen = true">{{ currentLevel }}</div>
				</span>
				<span title="Next" @mouseover="toggleLevelToTheSide('right', true)"
					@mouseleave="toggleLevelToTheSide('right', false)" @click="changeLevel(nextLevel)">
					<div>{{ nextLevel }}</div>
				</span>
				<div class="levels-chooser-small-level" style="right: -85px;">{{ afterNextLevel }}</div>
			</div>
			<div id="level-progress">
				<p>
					Level Progress <span>(by SRS Stages completed)</span>
					<button type="button" class="all-levels-button" title="All levels" aria-label="All levels" @click="levelPickerOpen = true">
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<rect x="3" y="3" width="5" height="5" rx="1" /><rect x="9.5" y="3" width="5" height="5" rx="1" /><rect x="16" y="3" width="5" height="5" rx="1" />
							<rect x="3" y="9.5" width="5" height="5" rx="1" /><rect x="9.5" y="9.5" width="5" height="5" rx="1" /><rect x="16" y="9.5" width="5" height="5" rx="1" />
							<rect x="3" y="16" width="5" height="5" rx="1" /><rect x="9.5" y="16" width="5" height="5" rx="1" /><rect x="16" y="16" width="5" height="5" rx="1" />
						</svg>
					</button>
				</p>
				<div class="level-progress-bar">
					<div :style="`width: ${levelProgressionInfo.progress?.percentage}%`"
						:title="`Passed Stages: ${levelProgressionInfo.progress?.passed} / ${levelProgressionInfo.progress?.size} (${levelProgressionInfo.progress?.percentage.toFixed(1)}%)`">
						<p v-if="levelProgressionInfo.progress?.percentage >= 8.1">
							{{ levelProgressionInfo.progress?.percentage.toFixed(1) }}%</p>
					</div>
					<span v-if="levelProgressionInfo.progress?.percentage < 81"
						:style="{ marginLeft: levelProgressionInfo.progress?.percentage == 0 ? '15px' : '6px' }">{{
							levelProgressionInfo.progress?.passed
						}} / {{
							levelProgressionInfo.progress?.size }}</span>
				</div>
				<!-- how much of the level is burned (once it's reached) -->
				<div
					v-if="timeOnLevel.clickable && levelBurn.total"
					class="level-burn"
					:class="{ all: levelBurn.all }"
					:title="`Burned: ${levelBurn.burned} / ${levelBurn.total}`"
				>
					<svg viewBox="4 1 16 22" aria-hidden="true">
						<path d="M12 1.5c.6 3.2 2.6 5 4.2 7.1A7.6 7.6 0 0 1 18 13.5 6 6 0 0 1 12 22a6 6 0 0 1-6-6c0-2.3 1-4 2.3-5.3.1 1.6.9 2.7 2 3-.7-3.4.5-7.3 1.7-12.2z" />
					</svg>
					<template v-if="levelBurn.all">
						<span class="level-burn-label"><b>All {{ levelBurn.total }}</b> burned</span>
					</template>
					<template v-else>
						<span class="level-burn-bar"><span :style="{ width: `${(levelBurn.burned / levelBurn.total) * 100}%` }"></span></span>
						<span class="level-burn-label"><b>{{ levelBurn.burned }}</b> / {{ levelBurn.total }} burned</span>
					</template>
				</div>
				<RouterLink
					v-if="timeOnLevel.clickable"
					:to="{ name: 'Levels' }"
					class="time-in-level clickable"
					:title="timeOnLevel.title"
				>
					<div class="label"><b>{{ timeOnLevel.label }}</b> on this level</div>
					<div title="Level reset history" class="past-times">
						<div class="past-times-n">{{ timeOnLevel.pastResets }}</div>
						<img src="/icons/profile/history.png" alt="">
					</div>
				</RouterLink>
				<div v-else class="time-in-level">
					<div class="label">{{ timeOnLevel.label }}</div>
					<div title="Level reset history" class="past-times">
						<div class="past-times-n">{{ timeOnLevel.pastResets }}</div>
						<img src="/icons/profile/history.png" alt="">
					</div>
				</div>
			</div>
			<!-- the fastest level up: when, and the kanji it counts on -->
			<LevelUpPath
				v-if="levelUpPrediction"
				:key="currentLevel"
				:path="levelUpPrediction.path"
				:spare="levelUpPrediction.spare"
				:readable="levelUpPrediction.readable"
				:level-up-at="levelUpPrediction.levelUpAt"
				:can-level-up-now="levelUpPrediction.canLevelUpNow"
				:locked-kanji="levelUpPrediction.lockedKanji"
				:title="levelUpPredictionTitle"
			/>
			<div class="clickable scroll-down" title="Scroll Down" @click="scrollToSubjects"><i class="down"></i></div>
		</div>
		<ProfileSubjectsPanel :subjects="levelSubjects" />

		<LevelPicker
			:open="levelPickerOpen"
			:selected-level="currentLevel"
			:user-level="userInfo?.level ?? null"
			:max-level="userInfo?.subscription?.max_level_granted ?? 60"
			:progress-by-level="levelProgressByLevel"
			:burn-by-level="levelBurnByLevel"
			@select="pickLevel"
			@close="levelPickerOpen = false"
		/>
	</div>
</template>

<script>
import { toRaw } from 'vue';
import { RouterLink } from 'vue-router';
import { useWKStore } from '@/stores';

import ProfileSubjectsPanel from '@/components/Profile/ProfileSubjectsPanel.vue';
import LevelPicker from '@/components/Profile/LevelPicker.vue';
import LevelUpPath from '@/components/Profile/LevelUpPath.vue';

import { getLevelUpPrediction, levelUpInfo } from '@/utils/scripts/wanikani';
import { getLevelStatsEntries } from '@/utils/scripts/levelStats';
import { prettyTime } from '@/utils/scripts/time';
import { normalizeProfileSubjects } from '@/utils/scripts/profileSubjects';
import { useAccolades } from '@/utils/scripts/useAccolades';
import { useFriendCount } from '@/utils/scripts/friendCount';
import { JLPT_READY_SHARE, jlptReadiness, jlptRows } from '@/utils/scripts/schoolKanji';

import WanikaniDefaultAvatar from '@/assets/wanikani-default.png';

export default {
	name: 'Profile',
	components: {
		ProfileSubjectsPanel,
		LevelPicker,
		LevelUpPath,
		RouterLink,
	},
	data() {
		return {
			fetchId: null,
			levelProgressionInfo: {},
			levelSubjects: [],

			beforePreviousLevel: null,
			previousLevel: null,
			currentLevel: null,
			nextLevel: null,
			afterNextLevel: null,
			levelPickerOpen: false,
			// a ref: unwrapped here, it stays up to date as friends change
			friendCount: useFriendCount(),
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		userInfo() {
			return this.wk.userInfo;
		},
		userAvatar() {
			return this.wk.userAvatar || WanikaniDefaultAvatar;
		},
		/** level → % of its (non-hidden) subjects passed, for the level picker's bars. */
		levelProgressByLevel() {
			const totals = {};
			for (const subject of this.wk.allSubjects) {
				if (!subject.level || subject.assignment?.hidden || subject.hidden_at) continue;
				const entry = totals[subject.level] ?? (totals[subject.level] = { passed: 0, total: 0 });
				entry.total += 1;
				if (subject.assignment?.passed_at) entry.passed += 1;
			}
			return Object.fromEntries(Object.entries(totals).map(
				([level, { passed, total }]) => [level, total ? (passed / total) * 100 : 0],
			));
		},
		/** level → % of its (non-hidden) subjects burned, for the level picker. */
		levelBurnByLevel() {
			const totals = {};
			for (const subject of this.wk.allSubjects) {
				if (!subject.level || subject.assignment?.hidden || subject.hidden_at) continue;
				const entry = totals[subject.level] ?? (totals[subject.level] = { burned: 0, total: 0 });
				entry.total += 1;
				if (subject.assignment?.burned_at || subject.assignment?.srs_stage === 9) entry.burned += 1;
			}
			return Object.fromEntries(Object.entries(totals).map(
				([level, { burned, total }]) => [level, total ? (burned / total) * 100 : 0],
			));
		},
		/** JLPT readiness (kanji and words passed per level, schoolKanji.ts) */
		jlpt() {
			const complete = this.wk.allSubjectsInMemory;
			return jlptReadiness(
				jlptRows(this.wk.allSubjects, 'kanji', complete),
				jlptRows(this.wk.allSubjects, 'vocabulary', complete),
			);
		},
		/** how far along the next level is: by its side furthest from ready (kanji or words) */
		jlptNextPercent() {
			const next = this.jlpt.next;
			if (!next) return 0;
			const progress = Math.min(next.kanji / JLPT_READY_SHARE.kanji, next.words / JLPT_READY_SHARE.words);
			return Math.min(99, Math.floor(progress * 100));
		},
		jlptTitle() {
			const percent = value => `${Math.floor(value * 100)}%`;
			const rule = `${percent(JLPT_READY_SHARE.kanji)} of the kanji and ${percent(JLPT_READY_SHARE.words)} of the words passed, up to that level`;
			const { ready, next } = this.jlpt;
			const lines = [
				ready
					? `Your kanji and words are at about JLPT ${ready} (${rule}). If you're thinking of the JLPT, ${ready} study materials should feel familiar on the kanji and vocabulary side.`
					: `Your kanji and words are working toward JLPT N5 (about there at ${rule}).`,
			];
			if (next) lines.push(`${next.label}: ${percent(next.kanji)} of the kanji, ${percent(next.words)} of the words (with the easier levels').`);
			lines.push('An estimate from WaniKani\'s kanji and words only: grammar, reading and listening aren\'t counted.');
			return lines.join('\n');
		},
		accoladeTotals() {
			return useAccolades().totals.value;
		},
		latestAccolade() {
			return useAccolades().latest.value;
		},
		timeOnLevel() {
			if (!this.currentLevel) {
				return { label: 'Not yet reached', pastResets: 0, title: '', clickable: false };
			}

			const stats = getLevelStatsEntries(this.wk.levelsStats, this.currentLevel);
			if (!stats.length) {
				return { label: 'Not yet reached', pastResets: 0, title: '', clickable: false };
			}

			// entries are newest attempt first (see normalizeLevelsStats)
			const lastStat = stats[0];
			const startedAt = new Date(lastStat.unlocked_at);
			const passedAt = lastStat.passed_at ? new Date(lastStat.passed_at) : new Date();
			const timeInLevel = passedAt.getTime() - startedAt.getTime();
			const options = timeInLevel >= 1000 * 60 * 60 ? { seconds: false, minutes: false } : {};

			return {
				label: prettyTime(timeInLevel, options),
				pastResets: stats.length - 1,
				title: `Started at: ${startedAt.toISOString().split('.')[0]}\nPassed at: ${passedAt.toISOString().split('.')[0]}`,
				clickable: true,
			};
		},
		/** the shown level's (visible) subjects burned: SRS stage 9 */
		levelBurn() {
			const subjects = this.levelSubjects.filter(subject => !subject.isHidden);
			const burned = subjects.filter(subject => subject.assignment?.srs_stage === 9).length;
			return { burned, total: subjects.length, all: subjects.length > 0 && burned === subjects.length };
		},
		levelUpPredictionTitle() {
			return 'The fastest possible level up: every radical and kanji of this level answered right, '
				+ 'each lesson and review done as soon as it\'s available. Kanji that aren\'t unlocked yet '
				+ 'count from when their radicals can reach Guru. Only 90% of the kanji are needed to level up.';
		},
		levelUpPrediction() {
			// radicals from other levels (rare): their assignment and level
			const assignmentById = new Map(this.wk.assignments.map(assignment => [assignment.subject_id, assignment]));
			const levelById = new Map(this.wk.allSubjects.map(subject => [subject.id, subject.level]));
			const prediction = getLevelUpPrediction(this.levelSubjects, {
				assignmentOf: id => assignmentById.get(id),
				levelOf: id => levelById.get(id),
			});
			if (!prediction) return null;

			return {
				...prediction,
				readable: prettyTime(prediction.intervalMs, { seconds: false }),
			};
		},
	},

	created() {
		const level = Number(this.$route.query.level) || this.userInfo?.level;
		if (level) {
			this.setLevels(level);
		}
	},

	mounted() {
		if (this.wk.levelProgressionInfo?.progress) {
			this.levelProgressionInfo = this.wk.levelProgressionInfo;
		}
		this.wk.refreshLevelProgressions();
	},

	watch: {
		'$route.query.level'(value) {
			const level = Number(value) || this.userInfo?.level;
			// setLevels updates the query itself; don't load the same level twice
			if (level && level !== this.currentLevel) this.setLevels(level);
		},
		'wk.assignments'() {
			if (this.currentLevel) {
				this.levelSubjects = this.buildLevelSubjects(this.currentLevel);
				this.levelProgressionInfo = levelUpInfo(this.levelSubjects);
			}
		},
	},

	methods: {
		buildLevelSubjects(level) {
			const materials = this.wk.allSubjects.filter(item => item.level == level);
			const assignmentById = new Map(
				this.wk.assignments.map(assignment => [assignment.subject_id, assignment]),
			);

			return normalizeProfileSubjects(materials.map(material => ({
				...material,
				assignment: assignmentById.get(material.id) || material.assignment || {},
			})));
		},
		toggleLevelToTheSide(side, show) {
			const levelsChooser = this.$refs.levelsChooser;
			if (levelsChooser) {
				const capitalizedSide = side.charAt(0).toUpperCase() + side.slice(1);
				levelsChooser.style["margin" + capitalizedSide] = show ? "50px" : "0px";
				const smallLevels = levelsChooser.querySelectorAll('.levels-chooser-small-level');
				const hiddenSmallLevel = side === 'left' ? smallLevels[0] : smallLevels[1];
				if (hiddenSmallLevel) {
					hiddenSmallLevel.style[side] = show ? "-25px" : "-85px";
				}
			}
		},
		pickLevel(level) {
			this.levelPickerOpen = false;
			this.changeLevel(level);
		},
		changeLevel(level) {
			if (level) {
				this.setLevels(level);
			}
		},
		setLevels(level) {
			this.fetchId = level;
			this.levelSubjects = this.buildLevelSubjects(level);
			this.levelProgressionInfo = levelUpInfo(this.levelSubjects);

			if (String(this.$route.query.level || '') !== String(level)) {
				this.$router.replace({ query: { ...this.$route.query, level } });
			}

			this.wk.fetchSubjectsForLevel(level).then((subjects) => {
				if (this.fetchId !== level || !subjects?.length) return;
				const next = normalizeProfileSubjects(subjects);
				// usually what the cache already showed: skip re-rendering every tile
				if (JSON.stringify(next) === JSON.stringify(toRaw(this.levelSubjects))) return;
				this.levelSubjects = next;
				this.levelProgressionInfo = levelUpInfo(this.levelSubjects);
			});

			this.beforePreviousLevel = level > 2 ? level - 2 : null;
			this.previousLevel = level > 1 ? level - 1 : null;
			this.currentLevel = level;
			this.nextLevel = level < 60 ? level + 1 : null;
			this.afterNextLevel = level < 59 ? level + 2 : null;
		},
		scrollToSubjects() {
			window.scrollTo({ top: 455, behavior: 'smooth' });
		},
	}
};
</script>

<style scoped>
.container {
	background-color: var(--default-color);
}

.top-level-list {
	display: flex;
	left: var(--frame-left, 0px);
	position: fixed;
	z-index: 9;
	background-color: var(--fill-color);
	width: var(--content-width);
	overflow: auto;
	scroll-behavior: smooth;
	transition: 0.2s;
	top: 50px;
}

.top-level-list>div {
	padding: 15px;
	background-color: var(--fill-color);
	border-right: 1px solid #e9e9e9;
}

.top-level-list>div:last-child {
	margin-right: 0;
}

.top-level-list>.passed-level,
.top-level-list>.current-level,
.top-level-list>.selected-level {
	color: white;
	font-weight: bold;
}

.top-level-list>.passed-level {
	background-color: var(--wanikani);
}

.top-level-list>.current-level {
	background-color: var(--wanikani-sec);
}

.top-level-list>.selected-level {
	background-color: var(--default-color);
}

.top-level-list-hidden {
	top: -5px;
}

.levels-chooser-wrapper {
	background-color: var(--default-color);
	color: white;
	position: relative;
	transition: 0.3s;
}

/* under the tiles (in the flow); the picture overlaps its bottom edge */
.levels-chooser-cover {
	width: 100%;
	height: 100px;
	background-color: var(--wanikani);
	background-image: url(/images/wanikani-background.png);
	background-size: cover;
	border-bottom: 4px solid white;
}

/* the header: the picture on the left, from 15px into the banner (as before the bar above);
   the name and start date beside it, just under the banner (it flows: no fixed positions) */
.profile-head {
	position: relative;
	z-index: 2;
	display: flex;
	align-items: flex-start;
	gap: 15px;
	margin-top: -85px;
	padding: 0 15px;
}

.profile-info {
	flex: 1;
	min-width: 0;
	/* the banner's bottom (85px) and a little */
	padding-top: 95px;
}

/* the name, the pencil at the right end */
.profile-name {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

/* a bar under the top bar, as wide as the banner: Accolades, Friends, JLPT, split by thin
   lines, like a second navigation bar */
.profile-stats {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	/* the top of a card the banner continues (the cells' hover kept inside the curve) */
	border-radius: 12px 12px 0 0;
	overflow: hidden;
	background: rgba(0, 0, 0, 0.22);
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.profile-stat {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	min-width: 0;
	padding: 9px 7px;
	color: #fff;
	text-decoration: none;
	transition: background-color 0.15s;
}

.profile-stat + .profile-stat {
	border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.profile-stat:hover {
	opacity: 1;
	background: rgba(255, 255, 255, 0.07);
}

.profile-stat-icon {
	flex-shrink: 0;
	width: 22px;
	height: 22px;
}

svg.profile-stat-icon {
	width: 18px;
	height: 18px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
}

/* the JLPT tile's "icon": a small tag */
.profile-stat-jlpt {
	display: flex;
	align-items: center;
	justify-content: center;
	width: auto;
	height: auto;
	padding: 2px 4px;
	border-radius: 5px;
	background: #3d6fd6;
	font-size: 8.5px;
	font-weight: 800;
	letter-spacing: 0.04em;
}

.profile-stat-text {
	display: flex;
	flex-direction: column;
	min-width: 0;
	line-height: 1.15;
}

.profile-stat-text b {
	font-size: 13px;
	white-space: nowrap;
}

.profile-stat-text small {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 10px;
	color: #b3b6cc;
}

.levels-chooser {
	display: flex;
	align-items: center;
	position: relative;
	transition: 0.3s;
	/* the header above it is in the flow now */
	padding-top: 12px;
}

.levels-chooser span {
	width: 100%;
	text-align: center;
	transition: 0.3s;
	user-select: none;
}

.levels-chooser span[title="Current"] {
	font-size: 70px;
	min-height: 80px;
}

.levels-chooser span[title="Previous"],
.levels-chooser span[title="Next"] {
	font-size: 40px;
	opacity: 0.3;
	display: flex;
	align-items: center;
}

.levels-chooser span[title="Previous"]:hover,
.levels-chooser span[title="Next"]:hover {
	opacity: 0.7;
	cursor: pointer;
	transform: scale(1.3);
}

.levels-chooser span[title="Previous"] {
	padding-left: 50px;
	margin-left: -50px;
}

.levels-chooser span[title="Next"] {
	padding-right: 50px;
	margin-right: -50px;
}

.levels-chooser span>div {
	width: 100%;
}

.levels-chooser-current {
	cursor: pointer;
	transition: opacity 0.15s;
}

.levels-chooser-current:hover {
	opacity: 0.8;
}

/* opens the 60-level picker: a small icon at the end of the "Level Progress" line */
.all-levels-button {
	display: flex;
	margin-left: auto;
	padding: 5px;
	border: none;
	border-radius: 6px;
	background: transparent;
	color: rgba(255, 255, 255, 0.55);
	cursor: pointer;
	transition: background-color 0.15s, color 0.15s;
}

.all-levels-button:hover {
	background: rgba(255, 255, 255, 0.1);
	color: #fff;
}

.all-levels-button svg {
	width: 14px;
	height: 14px;
	fill: currentColor;
}

.levels-chooser-small-level {
	font-size: 30px;
	opacity: 0.3;
	position: absolute;
	width: fit-content;
	pointer-events: none;
}

/* bar + "time on this level" read as one card; the header behind is dark in both themes */
.level-progress-bar {
	box-sizing: border-box;
	width: 100%;
	height: 28px;
	border-radius: var(--card-radius, 12px) var(--card-radius, 12px) 0 0;
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-bottom: none;
	overflow: hidden;
	/* the empty part of the bar follows the theme (white / dark) */
	background-color: var(--fill-color);
	display: flex;
	align-items: center;
	position: relative;
}

.level-progress-bar>div:first-child {
	background-color: var(--wanikani);
	height: 100%;
	width: 0;
	transition: 0.3s;
}

.level-progress-bar>span {
	background-color: unset;
	color: var(--font-sec-color);
	font-size: 13px;
	margin-left: 8px;
}

.level-progress-bar>div>p {
	height: 100%;
	color: white;
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: bold;
	font-size: 13px;
}

.level-progress-bar-marker {
	position: absolute;
	height: 100%;
	border-right: 2px solid var(--default-color);
	pointer-events: none;
}

.passed-subject-check {
	width: 14px;
	position: absolute;
	top: -3px;
	right: -5px;
	filter: invert(72%) sepia(73%) saturate(3496%) hue-rotate(87deg) brightness(106%) contrast(109%) drop-shadow(0px 0px 2px black);
	z-index: 1;
}

.subject-next-review {
	position: absolute;
	top: -4px;
	right: -8px;
	z-index: 1;
	text-shadow: 0 0 black;
	filter: drop-shadow(0px 0px 2px black);
}

.subject-next-review div {
	font-size: 10px;
	background-color: #42f541;
	padding: 2px 3px;
	border-radius: 5px;
	color: black;
}

#profile-pic a {
	display: block;
	opacity: unset !important;
}

#profile-pic a:hover img {
	border-color: var(--wanikani)
}

#profile-pic {
	flex-shrink: 0;
}

/* on the left, over the banner's edge */
#profile-pic img {
	display: block;
	border-radius: 50%;
	border: 4px solid white;
	width: 140px;
	height: 140px;
	object-fit: cover;
	background-color: var(--fill-color);
}

#username {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 17px;
	color: white;
}

#started {
	margin-top: 4px;
	font-size: 15px;
	color: gray;
}

/* the pencil, right after the name */
#edit {
	display: flex;
	flex-shrink: 0;
	padding: 3px;
	border-radius: 6px;
	opacity: 0.7;
	transition: opacity 0.15s, background-color 0.15s;
}

#edit:hover {
	opacity: 1;
	background: rgba(255, 255, 255, 0.1);
}

#edit img {
	width: 13px;
	filter: invert(1);
}

#level-progress {
	padding: 15px 15px;
	position: relative;
}

#level-progress>p {
	font-size: 16px;
	margin-bottom: 10px;
	padding-left: 10px;
	display: flex;
	align-items: center;
	column-gap: 6px;
}

#level-progress>p>span {
	color: gray;
	font-size: 12px;
}

/* between the bar and the time: a slim red bar of what's burned */
.level-burn {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 14px;
	background-color: rgba(255, 255, 255, 0.05);
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-bottom: none;
	border-top: none;
	box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.08);
}

.level-burn svg {
	flex-shrink: 0;
	width: 10px;
	height: 13px;
	fill: #ff3b3b;
}

.level-burn-bar {
	flex: 1;
	height: 6px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.12);
	overflow: hidden;
}

.level-burn-bar span {
	display: block;
	height: 100%;
	border-radius: 999px;
	background: #e20000;
}

.level-burn-label {
	flex-shrink: 0;
	font-size: 12px;
	color: rgba(255, 255, 255, 0.7);
	font-variant-numeric: tabular-nums;
}

.level-burn-label b {
	color: #fff;
}

/* all burned: no bar, the label centred */
.level-burn.all {
	justify-content: center;
}

.time-in-level {
	background-color: rgba(255, 255, 255, 0.05);
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-top: none;
	border-radius: 0 0 var(--card-radius, 12px) var(--card-radius, 12px);
	display: block;
	box-sizing: border-box;
	width: 100%;
	position: relative;
	color: inherit;
	text-decoration: none;
	transition: background-color 0.15s;
}

a.time-in-level:hover {
	background-color: rgba(255, 255, 255, 0.09);
}

.time-in-level > .label {
	text-align: center;
	padding: 12px 70px;
	font-size: 13px;
	color: rgba(255, 255, 255, 0.7);
}

.time-in-level > .label b {
	color: #fff;
}

.past-times {
	position: absolute;
	right: 14px;
	top: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	column-gap: 5px;
}

.past-times > .past-times-n {
	font-size: 13px;
	font-weight: bold;
	color: rgba(255, 255, 255, 0.7);
}

.past-times > img {
	width: 16px;
	/* black icon: make it light on the dark header */
	filter: invert(1);
	opacity: 0.6;
}

.scroll-down {
	padding: 15px 35px;
	text-align: center;
}

.scroll-down i {
	border-color: white;
	padding: 8px;
}
</style>

<style>
.profile .profile-subjects {
	min-height: 150px;
}
</style>