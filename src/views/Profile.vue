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

				</div>
			</div>
			<div class="clickable scroll-down" title="Scroll Down"><i class="down"></i></div>
		</div>
		<SubjectsList :values="values" type="srs" :grid="true" :colors="colors" :showTitle="false" :height="null" />
	</div>
</template>

<script>
import { getWKManager } from '@/lib/apiClient';
import { useWKStore } from '@/stores';

import SubjectsList from '@/components/Subjects/SubjectsList.vue';

import { typeColors } from '@/utils/scripts/wanikani';

import WanikaniDefaultAvatar from '@/assets/wanikani-default.png';

export default {
	name: 'Profile',
	components: {
		SubjectsList
	},
	data() {
		return {
			wkManager: null,
			userAvatar: WanikaniDefaultAvatar,
			userInfo: {},
			fetchId: null,

			beforePreviousLevel: null,
			previousLevel: null,
			currentLevel: null,
			nextLevel: null,
			afterNextLevel: null,

			values: [],
			colors: {},
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		typeColors() {
			return typeColors;
		}
	},

	created() {
		this.wkManager = getWKManager();
		this.colors = this.typeColors;
		if (this.wk.userInfo && Object.keys(this.wk.userInfo).length > 0) {
			this.userInfo = this.wk.userInfo;
			this.setLevels(this.userInfo.level);
		}
		if (this.wk.userAvatar) this.userAvatar = this.wk.userAvatar;

		this.wkManager.getUserInfo();

		this.wkManager.events.on("update:avatar", avatar => {
			if (avatar) this.userAvatar = avatar;
		});

		this.wkManager.events.on("update:user", user => {
			if (user) {
				this.userInfo = user; // store user info
				if (user.avatar) this.userAvatar = user.avatar; // set user avatar
				this.setLevels(user.level);
			}
		});

		this.wkManager.events.on("get:subjects", ({ state, data, context }) => {
			// make sure update is still relevant
			if (state === "updated" && this.fetchId !== context[0]) return;

			this.values = data;
		});
	},

	beforeUnmount() {
		this.wkManager.events.removeListener('update:avatar');
		this.wkManager.events.removeListener('update:user');
		this.wkManager.events.removeListener('get:subjects');
	},

	methods: {
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
			this.wkManager.getSubjectsByLevel(level);

			this.beforePreviousLevel = level > 2 ? level - 2 : null;
			this.previousLevel = level > 1 ? level - 1 : null;
			this.currentLevel = level;
			this.nextLevel = level < 60 ? level + 1 : null;
			this.afterNextLevel = level < 59 ? level + 2 : null;
		}
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
	background-color: white;
	width: 100%;
	overflow: auto;
	scroll-behavior: smooth;
	transition: 0.2s;
	top: 50px;
}

.top-level-list>div {
	padding: 15px;
	background-color: white;
	border-right: 1px solid #e9e9e9;
}

.top-level-list>div:last-child {
	margin-right: 44px;
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
	color: var(--fill-color);
	width: fit-content;
	margin: 10px auto;
	position: relative;
}

.level-up-prediction>div {
	color: var(--border-color);
}

.level-up-prediction-info {
	position: absolute;
	width: fit-content;
	background-color: white;
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
	background-color: #c7c7c7;
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
	color: #888888;
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
	padding: 15px 35px;
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
	background-color: white;
	border-bottom-left-radius: 25px;
	border-bottom-right-radius: 25px;
	display: inline-block;
	width: 100%;
	padding: 0 1px;
}

.time-in-level>.label {
	text-align: center;
	padding: 15px;
	font-size: 13px;
	color: var(--font-sec-color);
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
.profile .subjects-list-content {
	min-height: 150px;
}
</style>