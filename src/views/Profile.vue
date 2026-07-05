<template>
	<div class="container profile">
		<div class="levels-chooser-wrapper">
			<div class="levels-chooser-cover"></div>
			<div id="profile-pic">
				<a target="_blank" :href="userInfo?.profile_url" :title="userInfo?.profile_url">
					<img :src="userAvatar" alt="Profile Picture" />
				</a>
			</div>
			<div id="username">{{ userInfo?.username }}</div>
			<div id="started">Started at {{ userInfo?.started_at?.split("T")[0] }}</div>
			<div id="edit"><a href="https://www.wanikani.com/settings/account"
					title="https://www.wanikani.com/settings/account" target="_blank"><img
						src="@/assets/icons/profile/edit.png" alt="Edit"></a></div>
			<div class="levels-chooser" ref="levelsChooser">
				<div class="levels-chooser-small-level" style="left: -85px;">{{ beforePreviousLevel }}</div>
				<span title="Previous" @mouseover="toggleLevelToTheSide('left', true)"
					@mouseleave="toggleLevelToTheSide('left', false)" @click="changeLevel(previousLevel)">
					<div>{{ previousLevel }}</div>
				</span>
				<span title="Current">
					<div>{{ currentLevel }}</div>
				</span>
				<span title="Next" @mouseover="toggleLevelToTheSide('right', true)"
					@mouseleave="toggleLevelToTheSide('right', false)" @click="changeLevel(nextLevel)">
					<div>{{ nextLevel }}</div>
				</span>
				<div class="levels-chooser-small-level" style="right: -85px;">{{ afterNextLevel }}</div>
			</div>
			<div id="level-progress">
				<p>Level Progress <span>(by SRS Stages completed)</span></p>
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
							levelProgressionInfo.progress?.percentage.toFixed(1) }}%</span>
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
			<div
				v-if="levelUpPrediction"
				class="level-up-prediction"
				title="This prediction is considering that you review all necessary kanji from this level as soon as they are available. Remember that only 90% of kanji are required to level up."
			>
				<div class="level-up-prediction-value">
					<template v-if="levelUpPrediction.canLevelUpNow">
						You can level up <b>now</b>! Go do your reviews!
					</template>
					<template v-else>
						At least <b>{{ levelUpPrediction.readable }}</b> to level up.
						<div>{{ levelUpPrediction.levelUpAtLabel }}</div>
					</template>
				</div>
				<img src="/icons/sidebar/about.png" alt="">
			</div>
			<div class="clickable scroll-down" title="Scroll Down" @click="scrollToSubjects"><i class="down"></i></div>
		</div>
		<ProfileSubjectsPanel :subjects="levelSubjects" />
	</div>
</template>

<script>
import { RouterLink } from 'vue-router';
import { useWKStore } from '@/stores';

import ProfileSubjectsPanel from '@/components/Profile/ProfileSubjectsPanel.vue';

import { getLevelUpPrediction, levelUpInfo } from '@/utils/scripts/wanikani';
import { getLevelStatsEntries } from '@/utils/scripts/levelStats';
import { prettyTime } from '@/utils/scripts/time';
import { normalizeProfileSubjects } from '@/utils/scripts/profileSubjects';

import WanikaniDefaultAvatar from '@/assets/wanikani-default.png';

export default {
	name: 'Profile',
	components: {
		ProfileSubjectsPanel,
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
		timeOnLevel() {
			if (!this.currentLevel) {
				return { label: 'Not yet reached', pastResets: 0, title: '', clickable: false };
			}

			const stats = getLevelStatsEntries(this.wk.levelsStats, this.currentLevel);
			if (!stats.length) {
				return { label: 'Not yet reached', pastResets: 0, title: '', clickable: false };
			}

			const lastStat = stats[stats.length - 1];
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
		levelUpPrediction() {
			const kanji = this.levelSubjects.filter(
				subject => subject.type === 'kanji' && !subject.assignment?.hidden,
			);
			const prediction = getLevelUpPrediction(kanji);
			if (!prediction) return null;

			return {
				...prediction,
				readable: prettyTime(prediction.intervalMs, { seconds: false }),
				levelUpAtLabel: prediction.levelUpAt.toString().split(' GMT')[0],
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
			if (level) this.setLevels(level);
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
				this.levelSubjects = normalizeProfileSubjects(subjects);
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
	left: 0;
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

.levels-chooser-cover {
	position: absolute;
	width: 100%;
	height: 100px;
	background-color: var(--wanikani);
	background-image: url(/images/wanikani-background.png);
	background-size: cover;
	border-bottom: 4px solid white;
}

.levels-chooser {
	display: flex;
	align-items: center;
	position: relative;
	transition: 0.3s;
	padding-top: 175px;
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

.levels-chooser-small-level {
	font-size: 30px;
	opacity: 0.3;
	position: absolute;
	width: fit-content;
	pointer-events: none;
}

.level-up-prediction img {
	width: 13px;
	filter: invert(1);
	position: absolute;
	right: -30px;
	top: 0;
	bottom: 0;
	margin: auto;
	opacity: 0.6;
}

.level-up-prediction {
	text-align: center;
	color: white;
	width: fit-content;
	margin: 10px auto;
	position: relative;
}

.level-up-prediction > div {
	color: #d0d0d0;
}

.level-up-prediction-info {
	position: absolute;
	width: fit-content;
	background-color: var(--fill-color);
	padding: 5px;
	border-radius: 5px;
	color: var(--default-color) !important;
	left: -40px;
	right: -40px;
	z-index: 10;
	top: 35px;
	box-shadow: 0 0 5px 0px;
}

.level-progress-bar {
	width: 100%;
	height: 30px;
	border-top-left-radius: 25px;
	border-top-right-radius: 25px;
	border: 1px solid silver;
	overflow: hidden;
	background-color: var(--fill-color);
	box-shadow: inset 0px 2px 4px #888686;
	display: flex;
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
	color: #b9b9b9;
	margin-top: 7px;
	margin-left: 6px;
}

.level-progress-bar>div>p {
	height: 100%;
	color: white;
	text-align: center;
	padding-top: 7px;
	font-weight: bold;
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

#profile-pic {
	padding: 15px;
	position: absolute;
	z-index: 1;
}

#profile-pic a {
	opacity: unset !important;
}

#profile-pic a:hover img {
	border-color: var(--wanikani)
}

#profile-pic img {
	border-radius: 50%;
	border: 4px solid white;
	width: 140px;
	background-color: var(--fill-color);
}

#username {
	position: absolute;
	left: 170px;
	top: 110px;
	font-size: 17px;
	color: white;
}

#started {
	position: absolute;
	left: 170px;
	top: 135px;
	font-size: 15px;
	color: gray;
}

#edit {
	position: absolute;
	top: 115px;
	filter: invert(1);
	z-index: 1;
}

#edit img {
	width: 15px;
}

#edit {
	right: 15px;
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

.time-in-level {
	background-color: var(--fill-color);
	border-bottom-left-radius: 25px;
	border-bottom-right-radius: 25px;
	display: inline-block;
	width: 100%;
	padding: 0 1px;
	color: inherit;
	text-decoration: none;
}

.time-in-level > .label {
	text-align: center;
	padding: 15px;
	font-size: 13px;
	color: var(--font-sec-color);
}

.past-times {
	position: absolute;
	right: 50px;
	bottom: 25px;
	display: flex;
	align-items: center;
	column-gap: 5px;
}

.past-times > .past-times-n {
	font-size: 14px;
	font-weight: bold;
	color: var(--font-sec-color);
}

.past-times > img {
	width: 20px;
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