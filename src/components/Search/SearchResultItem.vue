<template>
	<li class="searchResultItemLine"
		:style="{ borderLeft: `4px solid ${subjectDisplay.srsStageColor(item, srsStages)}`, minHeight: hasSmallerData(item) ? '115px' : '148px' }">
		<div :data-item-id="item.id" class="kanjiDetails" @click="goToSubjectPage(item.id)">
			<div class="searchResultItem">
				<SubjectCharacters :item="item" :width="35" :height="35" />
			</div>
			<div class="searchResultType" :style="{ color: typeColors[item.type] }">{{ item.type.charAt(0).toUpperCase()
				+
				item.type.slice(1) }}</div>
			<div class="searchResultItemInfo" :style="{ minHeight: hasSmallerData(item) ? '0px' : '67px' }">
				<span class="searchResultItemTitle">{{ subjectDisplay.joinMeanings(item) }}</span>
				<template v-if="item.readings">
					<span v-if="item.type === 'vocabulary'">{{ subjectDisplay.readings(item) }}</span>
					<span v-if="subjectDisplay.onyomiReadings(item)"><b>ON:</b><span>{{
						subjectDisplay.onyomiReadings(item) }}</span></span>
					<span v-if="subjectDisplay.kunyomiReadings(item)"><b>KUN: </b><span>{{
						subjectDisplay.kunyomiReadings(item) }}</span></span>
				</template>
			</div>
		</div>
		<div class="searchResultItemType">
			<div v-if="item.pronunciation_audios" class="clickable"
				@click="playAudio(item.pronunciation_audios[0].url)">
				<img src="@/assets/icons/search/volume.png">
			</div>
			<div v-if="item.characters" class="clickable" title="Search for 泉"
				@click="$emit('search', item.characters)"><img src="@/assets/icons/search/search.png"></div>
			<div v-if="item.characters" class="clickable" title="Copy" @click="copyToClipboard(item.characters)"><img
					src="@/assets/icons/search/copy.png"></div>
			<div v-if="item.assignment?.srs_stage"><span
					:style="{ color: subjectDisplay.srsStageColor(item, srsStages) }">{{
						srsStages[item.assignment.srs_stage].short }}</span></div>
			<div><span>{{ item.level }}</span></div>
		</div>
	</li>
</template>

<script>
import { srsStages, typeColors, subjectDisplay } from '@/utils/scripts/wanikani';

import SubjectCharacters from '@/components/Subjects/SubjectCharacters.vue';

export default {
	name: 'SearchResultItem',
	components: {
		SubjectCharacters
	},
	props: {
		item: {
			type: Object,
			required: true
		}
	},

	computed: {
		srsStages() {
			return srsStages;
		},
		subjectDisplay() {
			return subjectDisplay;
		},
		typeColors() {
			return typeColors;
		}
	},

	methods: {
		goToSubjectPage(id) {
			this.$router.push({ name: 'Subject', params: { id } });
		},
		playAudio(url) {
			const audio = new Audio(url);
			audio.play();
		},
		hasSmallerData(item) {
			return ['radical', 'kana_vocabulary'].includes(item.type);
		},
		copyToClipboard(text) {
			navigator.clipboard.writeText(text).then(() => {
				console.log('Copied to clipboard:', text);
			}).catch(err => {
				console.error('Error copying to clipboard:', err);
			});
		}
	}
};
</script>

<style scoped>
.searchResultItemLine {
	display: flex;
	transition: 0.2s;
	position: relative;
	margin: 2px 3px;
	text-align: left;
	color: white;
	background-color: var(--default-color);
	border-radius: 15px;
	min-height: 148px;
	overflow: hidden;
}

.searchResultItemLine .kanjiDetails {
	display: flex;
	width: 90%;
	cursor: pointer;
	flex-direction: column;
}

.searchResultItemLine span {
	padding: 4px;

}

.searchResultItemSquare {
	display: inline-flex !important;
	padding: 7px !important;
	min-height: unset !important;
}

.searchResultItemSquare>div {
	width: unset !important;
}

.searchResultItemSquare .searchResultItem {
	margin: 0 !important;
	padding: 0 !important;
}

.searchResultItemSquare .searchResultType,
.searchResultItemSquare .searchResultItemInfo,
.searchResultItemSquare .searchResultItemType {
	display: none !important;
}

.searchResultItem {
	font-size: 35px;
	padding-right: 0px !important;
	margin-left: 5px;
}

.searchResultItem img {
	padding: 4px;
}

.searchResultType {
	padding: 0px 10px;
	padding-bottom: 7px;
}

.searchResultVocab {
	writing-mode: vertical-rl;
	text-orientation: upright;
	padding: 0px !important;
	margin-left: -5px;
}

.searchResultItemLevel {
	position: absolute;
	background-color: white;
	color: black;
	padding: 3px !important;
	font-size: 12px;
	right: 0;
	top: 0;
	font-weight: 900;
	width: 14px;
	text-align: center;
	box-shadow: black 0px 3px 0px 0px;
	border: 1px solid black;
}

.searchResultItemTitle {
	font-size: 17px;
	font-weight: 900;
	border-bottom: 1px solid #a3a3a3;
	padding: 6px 0 !important;
	height: fit-content;
}

.searchResultItemInfo {
	background-color: white;
	padding: 2px 10px;
	pointer-events: none;
	color: black;
	min-height: 67px;
	border-bottom: 7px solid var(--default-color);
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.searchResultItemInfo span {
	padding-left: 0 !important;
	display: flex;
	align-items: center;
	gap: 10px;
	padding: unset;
}

.searchResultItemType {
	top: 0px;
	right: 0px;
	position: absolute;
	padding: 0 !important;
	border-bottom-right-radius: 6px;
	height: 100%;
	width: 45px;
	display: flex;
	flex-direction: column;
	text-align: center;
	background-color: var(--default-color);
	border-left: 1px solid #a3a3a3;
}

.searchResultItemType>div {
	padding: 5px;
}

.searchResultItemType>div:first-child {
	margin-top: 4px;
}

.searchResultItemType>div:not(:last-child) {
	border-bottom: 1px solid #a3a3a3;
}

.searchResultItemType img {
	width: 15px;
	filter: invert(1);
}


.searchResultItemType-normal {
	width: 20px;
	height: 20px;
}

.searchResultItemType-small {
	width: 15px;
	height: 15px;
}

.searchResultItemType-tiny {
	width: 10px;
	height: 10px;
}
</style>