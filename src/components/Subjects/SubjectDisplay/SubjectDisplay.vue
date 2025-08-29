<template>
	<div class="subject-details">
		<div class="sd-detailsPopup sd-focusPopup"
			:style="{ borderColor: subjectDisplay.srsStageColor(item, srsStages) }">
			<div class="sd-focusPopup_kanji">
				<div style="text-align: center;">
					<a :href="item.document_url" target="_blank">
						<SubjectCharacters :item="item" :height="80" :width="80" class="sd-detailsPopup_kanji" />
					</a>
					<ul class="sd-popupDetails_readings">
						<!-- NO READINGS -->
						<li v-if="!item.readings" class="sd-popupDetails_readings_row">{{ item.meanings[0].meaning }}
						</li>
						<template v-else>
							<!-- READINGS -->
							<li v-if="item.type === 'vocabulary'" class="sd-popupDetails_readings_row">
								<span>{{ subjectDisplay.readings(item) }}</span>
							</li>

							<!-- READINGS ONYOMI -->
							<li v-if="subjectDisplay.onyomiReadings(item)" class="sd-popupDetails_readings_row">
								<strong>ON:</strong> <span>{{ subjectDisplay.onyomiReadings(item) }}</span>
							</li>
							<!-- READINGS KUNYOMI -->
							<li v-if="subjectDisplay.kunyomiReadings(item)" class="sd-popupDetails_readings_row">
								<strong>KUN:</strong> <span>{{ subjectDisplay.kunyomiReadings(item) }}</span>
							</li>
						</template>
					</ul>
				</div>
			</div>
			<div class="sd-popupDetails_detailedInfoWrapper"
				:style="{ paddingBottom: Object.keys(item.reviews).length > 0 ? '20px' : '' }">
				<div class="sd-popupDetails_details">
					<!-- AUDIO -->
					<div v-if="item.pronunciation_audios" @click="playAudio(item.pronunciation_audios[0].url)"
						class="sd-detailsPopup_clickable sd-detailsPopup_subjectAudio">
						<img :src="SoundIcon">
					</div>

					<!-- LEVEL -->
					<div v-if="item.level"><strong>Level {{ item.level }} {{ item.type }}</strong></div>
					<!-- STS STAGE -->
					<div class="sd-detailsPopup_label-img">
						<strong :style="{ color: subjectDisplay.srsStageColor(item, srsStages) }">{{
							subjectDisplay.srsStageName(item, srsStages) }}</strong>
					</div>
					<!-- JLPT & JOYO -->

					<!-- PARTS OF SPEECH -->
					<div v-if="item.parts_of_speech" style="color: #b8b8b8">{{ subjectDisplay.partsOfSpeech(item) }}
					</div>

					<!-- MEANING -->
					<div class="sd-popupDetails_kanjiTitle">
						<strong>{{ subjectDisplay.joinMeanings(item) }}</strong>
					</div>

					<!-- STROKES -->
					<KanjiDrawPlayer v-if="item.characters" :item="item" />

					<!-- MEANING MNEMONIC -->
					<div class="sd-detailsPopup_sectionContainer">
						<strong class="sd-popupDetails_title">Meaning Mnemonic</strong>
						<p class="sd-popupDetails_p" v-html="item.meaning_mnemonic"></p>
						<p class="sd-popupDetails_p" v-html="item.meaning_hint" v-if="item.meaning_hint"></p>
					</div>

					<!-- READING MNEMONIC -->
					<div v-if="item.reading_mnemonic" class="sd-detailsPopup_sectionContainer">
						<strong class="sd-popupDetails_title">Reading Mnemonic</strong>
						<p class="sd-popupDetails_p" v-html="item.reading_mnemonic"></p>
						<p class="sd-popupDetails_p" v-html="item.reading_hint" v-if="item.reading_hint"></p>
					</div>

					<!-- CONTEXT SENTECES -->
					<div v-if="item.context_sentences" class="sd-detailsPopup_sectionContainer">
						<strong class="sd-popupDetails_title">Context Sentences</strong>
						<ul v-for="sentence in item.context_sentences" :key="sentence.ja"
							class="sd-detailsPopup_sentencesWrapper">
							<li class=" sd-popupDetails_p">
								<span v-html="sentence.ja"></span>
								<span style="color: #b8b8b8;" v-html="sentence.en"></span>
							</li>
						</ul>
					</div>
				</div>
				<!-- QUICK STATS -->
				<div v-if="Object.keys(item.reviews).length > 0" class="sd-popupDetails_quickStats">
					<ul style="display: inline-flex !important;">
						<li v-if="!hasReviews()" style="color: #cbcbcb;">
							No reviews yet
						</li>
						<template v-else>
							<li title="Overall" class="sd-detailsPopup_img-label">
								<img :src="CheckmarkIcon">
								<span :style="{ color: this.correctnessColor(item.reviews.percentage_correct) }">{{
									item.reviews.percentage_correct }}%</span>
							</li>

							<li title="Meaning" class="sd-detailsPopup_img-label">
								<img :src="BookIcon">
								<span :style="{ color: this.correctnessColor(meaningCorrect()) }">{{ meaningCorrect()
								}}%</span>
							</li>

							<li title="Reading" class="sd-detailsPopup_img-label">
								<img :src="EyeIcon">
								<span :style="{ color: this.correctnessColor(readingCorrect()) }">{{ readingCorrect()
								}}%</span>
							</li>
						</template>
					</ul>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import '@/utils/styles/subject-display.css';

import KanjiDrawPlayer from '@/components/Subjects/SubjectDisplay/KanjiDrawPlayer.vue';
import SubjectCharacters from '@/components/Subjects/SubjectCharacters.vue';

import { srsStages, subjectDisplay } from '@/utils/scripts/wanikani';
import { correctnessColor } from '@/utils/scripts/common';

import SoundIcon from '@/assets/icons/subjectDetails/volume.png';
import CloseIcon from '@/assets/icons/subjectDetails/close-thin.png';
import CheckmarkIcon from '@/assets/icons/subjectDetails/checkmark.png';
import BookIcon from '@/assets/icons/subjectDetails/language.png';
import EyeIcon from '@/assets/icons/subjectDetails/eye.png';

export default {
	name: 'SubjectDisplay',
	components: {
		KanjiDrawPlayer,
		SubjectCharacters
	},
	props: {
		item: {
			type: Object,
			required: true
		}
	},

	data() {
		return {
			SoundIcon,
			CloseIcon,
			CheckmarkIcon,
			BookIcon,
			EyeIcon
		};
	},

	computed: {
		srsStages() {
			return srsStages;
		},
		subjectDisplay() {
			return subjectDisplay;
		},
		correctnessColor() {
			return correctnessColor;
		}
	},

	mounted() {
		console.log(this.item);
		window.scrollTo(0, 0);

		// if pronunciation audio exists, play it
		if (this.item.pronunciation_audios && this.item.pronunciation_audios.length > 0) {
			this.playAudio(this.item.pronunciation_audios[0].url);
		}
	},

	methods: {
		playAudio(url) {
			const audio = new Audio(url);
			audio.play();
		},
		hasReviews() {
			const { meaning_correct, meaning_incorrect, reading_correct, reading_incorrect } = this.item.reviews;
			return meaning_correct + meaning_incorrect + reading_correct + reading_incorrect > 0;
		},
		meaningCorrect() {
			return this._calculatePercentage(this.item.reviews.meaning_correct, this.item.reviews.meaning_incorrect);
		},
		readingCorrect() {
			return this._calculatePercentage(this.item.reviews.reading_correct, this.item.reviews.reading_incorrect);
		},
		_calculatePercentage(correct, incorrect) {
			const total = correct + incorrect;
			if (total === 0) return 0;
			return Math.round((correct / total) * 100);
		}
	},
};
</script>

<style scoped></style>