<template>
	<div class="subject-details">
		<div class="sd-detailsPopup"
			:class="{ 'sd-focusPopup': focused }"
			:style="popupStyle"
			@click.capture="onHighlightClick"
			@mouseenter="onPopupMouseEnter"
			@mouseleave="onPopupMouseLeave">
			<div :class="focused ? 'sd-focusPopup_kanji' : 'sd-compactPopup_body'">
				<SubjectDisplayPopupControls
					v-if="popupChrome"
					:focused="focused"
					:can-go-back="canGoBack"
					@close="$emit('close')"
					@back="$emit('back')"
					@scroll-top="scrollToTop"
				/>
				<p v-if="compact && primaryMeaning" class="sd-smallDetailsPopupKanjiTitle">
					{{ primaryMeaning }}
				</p>
				<div class="sd-popupDetails_kanjiHeader" :style="kanjiHeaderStyle">
					<a :href="item.document_url" target="_blank">
						<SubjectCharacters :item="item" :height="80" :width="80" class="sd-detailsPopup_kanji" />
					</a>
					<ul class="sd-popupDetails_readings">
						<li v-if="!item.readings && !compact" class="sd-popupDetails_readings_row">
							{{ item.meanings[0].meaning }}
						</li>
						<template v-else>
							<li v-if="item.type === 'vocabulary' || item.type === 'kana_vocabulary'" class="sd-popupDetails_readings_row">
								<span>{{ subjectDisplay.readings(item) }}</span>
							</li>
							<li v-if="subjectDisplay.onyomiReadings(item)" class="sd-popupDetails_readings_row">
								<strong>ON:</strong> <span>{{ subjectDisplay.onyomiReadings(item) }}</span>
							</li>
							<li v-if="subjectDisplay.kunyomiReadings(item)" class="sd-popupDetails_readings_row">
								<strong>KUN:</strong> <span>{{ subjectDisplay.kunyomiReadings(item) }}</span>
							</li>
						</template>
					</ul>
				</div>
			</div>

			<div
				v-if="focused"
				ref="detailedInfoWrapper"
				class="sd-popupDetails_detailedInfoWrapper"
				:style="{ paddingBottom: '20px' }"
				@scroll="onDetailsScroll"
			>
				<SubjectDisplaySectionNav
					v-if="showExtendedSections"
					:show-cards="hasRelatedCards"
					:show-statistics="!!reviewStats"
					:show-timestamps="hasTimestamps"
					:active-tab="activeSection"
					@scroll-section="scrollToSection"
				/>

				<div class="sd-popupDetails_details" style="padding: 15px 15px; margin-bottom: 24px; position: relative;">
					<div
						v-if="item.pronunciation_audios"
						class="sd-detailsPopup_clickable sd-detailsPopup_subjectAudio"
						title="Subject Audio"
						style="position: absolute; top: 45px; right: 10px; filter: invert(1);"
						@click="playAudio(item.pronunciation_audios[0].url)"
					>
						<img :src="SoundIcon" style="width: 18px;" alt="">
					</div>

					<div id="sd-popupDetails_InfoSection" class="sd-popupDetails_anchor"></div>
					<div><strong>Level {{ item.level }} {{ subjectTypeLabel }}</strong></div>
					<div class="sd-detailsPopup_label-img" :title="srsSection.title">
						<strong :style="{ color: srsSection.color }">{{ srsSection.text }}</strong>
						<img v-if="srsSection.icon" :src="srsSection.icon" style="width: 13px;" alt="">
					</div>
					<div v-if="schoolGradesLine" class="sd-popupDetails_schoolGrades" title="JLPT, Joyo">
						{{ schoolGradesLine }}
					</div>
					<div v-if="item.parts_of_speech" class="sd-popupDetails_partsOfSpeech">
						{{ subjectDisplay.partsOfSpeech(item) }}
					</div>
					<div>
						<strong class="sd-popupDetails_kanjiTitle">{{ subjectDisplay.joinMeanings(item) }}</strong>
					</div>

					<KanjiDrawPlayer
						v-if="item.characters && showStrokes"
						:key="`${item.id}-${dmakStrokeSize}`"
						:item="item"
						:allow-expand="showExtendedSections"
						:stroke-size="dmakStrokeSize"
					/>

					<div v-if="item.meaning_mnemonic" class="sd-detailsPopup_sectionContainer">
						<strong class="sd-popupDetails_title">Meaning Mnemonic</strong>
						<p class="sd-popupDetails_p" v-html="item.meaning_mnemonic"></p>
						<p v-if="item.meaning_hint" class="sd-popupDetails_p" v-html="item.meaning_hint"></p>
					</div>

					<div v-if="item.reading_mnemonic" class="sd-detailsPopup_sectionContainer">
						<strong class="sd-popupDetails_title">Reading Mnemonic</strong>
						<p class="sd-popupDetails_p" v-html="item.reading_mnemonic"></p>
						<p v-if="item.reading_hint" class="sd-popupDetails_p" v-html="item.reading_hint"></p>
					</div>

					<SubjectDisplayRelatedCards
						v-if="showExtendedSections"
						:item="item"
						:related-subjects="relatedSubjects"
						@open-subject="id => $emit('open-subject', id)"
					/>

					<div v-if="item.context_sentences" class="sd-detailsPopup_sectionContainer">
						<strong class="sd-popupDetails_title">Context Sentences</strong>
						<ul
							v-for="sentence in item.context_sentences"
							:key="sentence.ja"
							class="sd-detailsPopup_sentencesWrapper"
						>
							<li class="sd-popupDetails_p">
								<span v-html="sentence.ja"></span>
								<span style="color: #b8b8b8;" v-html="sentence.en"></span>
							</li>
						</ul>
					</div>

					<SubjectDisplayReviewStatistics v-if="showExtendedSections" :item="item" />
					<SubjectDisplayAssignmentTimestamps v-if="showExtendedSections" :item="item" />
				</div>

				<div class="sd-popupDetails_quickStats">
					<ul style="display: inline-flex !important;">
						<li v-if="!reviewStats || !hasReviewActivity" style="color: #cbcbcb;">
							No reviews yet
						</li>
						<template v-else>
							<li title="Overall" class="sd-detailsPopup_img-label">
								<img :src="CheckmarkIcon">
								<span :style="{ color: percentageColor(reviewStats.percentage_correct) }">
									{{ Math.round(reviewStats.percentage_correct) }}%
								</span>
							</li>
							<li title="Meaning" class="sd-detailsPopup_img-label">
								<img :src="BookIcon">
								<span :style="{ color: percentageColor(meaningCorrect()) }">{{ meaningCorrect() }}%</span>
							</li>
							<li title="Reading" class="sd-detailsPopup_img-label">
								<img :src="EyeIcon">
								<span :style="{ color: percentageColor(readingCorrect()) }">{{ readingCorrect() }}%</span>
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
import SubjectDisplayPopupControls from '@/components/Subjects/SubjectDisplay/SubjectDisplayPopupControls.vue';
import SubjectDisplaySectionNav from '@/components/Subjects/SubjectDisplay/SubjectDisplaySectionNav.vue';
import SubjectDisplayRelatedCards from '@/components/Subjects/SubjectDisplay/SubjectDisplayRelatedCards.vue';
import SubjectDisplayReviewStatistics from '@/components/Subjects/SubjectDisplay/SubjectDisplayReviewStatistics.vue';
import SubjectDisplayAssignmentTimestamps from '@/components/Subjects/SubjectDisplay/SubjectDisplayAssignmentTimestamps.vue';

import { srsStages, subjectDisplay } from '@/utils/scripts/wanikani';
import { correctnessColor } from '@/utils/scripts/common';
import { useSettingsStore } from '@/stores/settings';
import { DEFAULT_HIGHLIGHT_STYLE_VARS } from '@/utils/highlight/highlightStyleVars';
import {
	applySubjectDetailsHighlights,
	clearSubjectDetailsHighlights,
} from '@/utils/highlight/subjectDetailsHighlight';
import { HIGHLIGHT_MARK_CLASS } from '@/utils/highlight/highlighter';
import {
	buildAssignmentTimestamps,
	getCardSections,
	getCompactPopupWidthPx,
	getDmakStrokeSizePx,
	getPopupKanjiFontSizePx,
	getReviewStats,
	formatSubjectSchoolGrades,
	hasReviewActivity,
	getSubjectType,
} from '@/utils/scripts/subjectDetailsPopup';

import SoundIcon from '@/assets/icons/subjectDetails/volume.png';
import CheckmarkIcon from '@/assets/icons/subjectDetails/checkmark.png';
import BookIcon from '@/assets/icons/subjectDetails/language.png';
import EyeIcon from '@/assets/icons/subjectDetails/eye.png';

export default {
	name: 'SubjectDisplay',

	components: {
		KanjiDrawPlayer,
		SubjectCharacters,
		SubjectDisplayPopupControls,
		SubjectDisplaySectionNav,
		SubjectDisplayRelatedCards,
		SubjectDisplayReviewStatistics,
		SubjectDisplayAssignmentTimestamps,
	},

	props: {
		item: {
			type: Object,
			required: true,
		},
		focused: {
			type: Boolean,
			default: true,
		},
		compact: {
			type: Boolean,
			default: false,
		},
		showStrokes: {
			type: Boolean,
			default: true,
		},
		autoplayAudio: {
			type: Boolean,
			default: true,
		},
		scrollTopOnMount: {
			type: Boolean,
			default: true,
		},
		enableContentHighlight: {
			type: Boolean,
			default: true,
		},
		highlightClickMode: {
			type: Boolean,
			default: false,
		},
		highlightStyleVars: {
			type: Object,
			default: null,
		},
		popupChrome: {
			type: Boolean,
			default: false,
		},
		extendedDetails: {
			type: Boolean,
			default: false,
		},
		relatedSubjects: {
			type: Object,
			default: () => ({}),
		},
		canGoBack: Boolean,
		popupWidth: {
			type: Number,
			default: 300,
		},
	},

	emits: [
		'highlight-subject',
		'close',
		'back',
		'open-subject',
		'copy-subject',
		'popup-hover',
	],

	data() {
		return {
			SoundIcon,
			CheckmarkIcon,
			BookIcon,
			EyeIcon,
			activeSection: 'Info',
		};
	},

	computed: {
		srsStages() {
			return srsStages;
		},
		subjectDisplay() {
			return subjectDisplay;
		},
		percentageColor() {
			return correctnessColor;
		},
		highlightVars() {
			if (this.highlightStyleVars) return this.highlightStyleVars;

			const appearance = useSettingsStore().settings?.appearance ?? {};
			return {
				'--wk-highlight-learned':
					appearance.highlight_learned || DEFAULT_HIGHLIGHT_STYLE_VARS['--wk-highlight-learned'],
				'--wk-highlight-not-learned':
					appearance.highlight_not_learned || DEFAULT_HIGHLIGHT_STYLE_VARS['--wk-highlight-not-learned'],
			};
		},
		showExtendedSections() {
			return this.popupChrome || this.extendedDetails;
		},
		primaryMeaning() {
			const meanings = this.item?.meanings;
			if (!meanings?.length) return '';
			return (meanings.find(m => m.primary) ?? meanings[0]).meaning;
		},
		reviewStats() {
			return getReviewStats(this.item?.reviews);
		},
		hasReviewActivity() {
			return hasReviewActivity(this.reviewStats);
		},
		hasRelatedCards() {
			return getCardSections(this.item, this.relatedSubjects).length > 0;
		},
		hasTimestamps() {
			return Boolean(buildAssignmentTimestamps(this.item?.assignment));
		},
		subjectTypeLabel() {
			return getSubjectType(this.item).split('_').join(' ');
		},
		schoolGradesLine() {
			return formatSubjectSchoolGrades(this.item);
		},
		srsSection() {
			if (this.item.hidden_at) {
				return {
					text: 'Legacy',
					color: 'yellow',
					title: `This subject no longer shows up in lessons or reviews, since ${this.item.hidden_at?.split('T')[0]}.`,
					icon: null,
				};
			}

			const stage = this.item.assignment?.srs_stage ?? this.item.srs_stage;
			if (stage >= 0 && stage <= 9) {
				return {
					text: srsStages[stage]?.name ?? 'Locked',
					color: srsStages[stage]?.color ?? '#888',
					title: this.item.assignment?.passed_at ? 'Subject passed.' : '',
					icon: null,
				};
			}

			return {
				text: 'Locked',
				color: srsStages[0]?.color ?? '#888',
				title: '',
				icon: null,
			};
		},
		effectivePopupWidth() {
			if (this.focused) return this.popupWidth;
			return getCompactPopupWidthPx(this.item?.characters, this.popupWidth);
		},
		kanjiHeaderStyle() {
			return {
				'--popup-kanji-font-size': `${getPopupKanjiFontSizePx(this.item?.characters)}px`,
			};
		},
		dmakStrokeSize() {
			const characters = this.item?.characters;
			if (!characters) return null;
			return getDmakStrokeSizePx(characters, this.effectivePopupWidth);
		},
		popupStyle() {
			const borderColor = this.item.hidden_at
				? 'yellow'
				: subjectDisplay.srsStageColor(this.item, srsStages);
			const style = {
				borderTop: `4px solid ${borderColor}`,
				...this.highlightVars,
			};

			if (this.popupChrome && !this.focused) {
				style.width = `${this.effectivePopupWidth}px`;
			}

			return style;
		},
	},

	watch: {
		item: {
			handler() {
				this.activeSection = 'Info';
				if (this.popupChrome && !this.focused) return;
				this.$nextTick(() => this.applyContentHighlights());
			},
		},
		focused(isFocused) {
			if (isFocused) this.$nextTick(() => this.applyContentHighlights());
			else if (this.$el) clearSubjectDetailsHighlights(this.$el);
		},
	},

	mounted() {
		if (this.scrollTopOnMount) window.scrollTo(0, 0);

		if (this.autoplayAudio && getSubjectType(this.item) === 'vocabulary' && this.item.pronunciation_audios?.length > 0) {
			this.playAudio(this.item.pronunciation_audios[0].url);
		}

		this.$nextTick(() => this.applyContentHighlights());
		document.addEventListener('wkh:details-scroll-top', this.scrollToTop);
		document.addEventListener('wkh:details-scroll-section', this.onExternalScrollSection);
		document.addEventListener('wkh:details-nav-section', this.onExternalNavSection);
	},

	beforeUnmount() {
		if (this.$el) clearSubjectDetailsHighlights(this.$el);
		document.removeEventListener('wkh:details-scroll-top', this.scrollToTop);
		document.removeEventListener('wkh:details-scroll-section', this.onExternalScrollSection);
		document.removeEventListener('wkh:details-nav-section', this.onExternalNavSection);
	},

	methods: {
		onPopupMouseEnter() {
			if (this.popupChrome) this.$emit('popup-hover', true);
		},
		onPopupMouseLeave() {
			if (this.popupChrome) this.$emit('popup-hover', false);
		},
		onExternalScrollSection(event) {
			this.scrollToSection(event.detail);
		},
		onExternalNavSection(event) {
			const tabs = ['Info'];
			if (this.hasRelatedCards) tabs.push('Cards');
			if (this.reviewStats) tabs.push('Statistics');
			if (this.hasTimestamps) tabs.push('Timestamps');

			const index = tabs.indexOf(this.activeSection);
			if (index === -1) return;

			const nextIndex = event.detail === 'ArrowRight'
				? (index + 1) % tabs.length
				: (index - 1 + tabs.length) % tabs.length;
			this.scrollToSection(tabs[nextIndex]);
		},
		scrollToTop() {
			this.$refs.detailedInfoWrapper?.scrollTo({ top: 0, behavior: 'smooth' });
			this.activeSection = 'Info';
		},
		scrollToSection(section) {
			const wrapper = this.$refs.detailedInfoWrapper;
			if (!wrapper) return;

			const anchor = wrapper.querySelector(`#sd-popupDetails_${section}Section`);
			if (anchor instanceof HTMLElement) {
				wrapper.scrollTo({ top: anchor.offsetTop, behavior: 'smooth' });
				this.activeSection = section;
			}
		},
		onDetailsScroll(event) {
			const wrapper = event.target;
			if (!(wrapper instanceof HTMLElement)) return;

			const scrollTop = wrapper.scrollTop;
			const cards = wrapper.querySelector('#sd-popupDetails_CardsSection');
			const stats = wrapper.querySelector('#sd-popupDetails_StatisticsSection');
			const timestamps = wrapper.querySelector('#sd-popupDetails_TimestampsSection');

			if (cards instanceof HTMLElement && scrollTop < cards.offsetTop) {
				this.activeSection = 'Info';
				return;
			}
			if (cards instanceof HTMLElement && stats instanceof HTMLElement
				&& scrollTop >= cards.offsetTop && scrollTop < stats.offsetTop) {
				this.activeSection = 'Cards';
				return;
			}
			if (stats instanceof HTMLElement && timestamps instanceof HTMLElement
				&& scrollTop >= stats.offsetTop && scrollTop < timestamps.offsetTop) {
				this.activeSection = 'Statistics';
				return;
			}
			if (timestamps instanceof HTMLElement && scrollTop >= timestamps.offsetTop) {
				this.activeSection = 'Timestamps';
			}
		},
		async applyContentHighlights() {
			if (!this.enableContentHighlight || !this.$el) return;
			if (this.popupChrome && !this.focused) return;
			await applySubjectDetailsHighlights(this.$el, {
				markHoverable: this.highlightClickMode,
			});
		},
		onHighlightClick(event) {
			const target = event.target;
			if (!(target instanceof Element)) return;

			const span = target.closest(`span.${HIGHLIGHT_MARK_CLASS}`);
			if (!span || span.closest('.sd-focusPopup_kanji, .sd-compactPopup_body')) return;

			const value = span.textContent?.trim();
			if (!value) return;

			event.preventDefault();
			event.stopPropagation();
			this.$emit('highlight-subject', {
				value,
				type: span.getAttribute('data-wkh-type') ?? undefined,
			});
		},
		playAudio(url) {
			if (!url) return;
			const audio = new Audio(url);
			void audio.play();
		},
		meaningCorrect() {
			return this._calculatePercentage(this.reviewStats?.meaning_correct, this.reviewStats?.meaning_incorrect);
		},
		readingCorrect() {
			return this._calculatePercentage(this.reviewStats?.reading_correct, this.reviewStats?.reading_incorrect);
		},
		_calculatePercentage(correct, incorrect) {
			const total = (correct || 0) + (incorrect || 0);
			if (total === 0) return 0;
			return Math.round(((correct || 0) / total) * 100);
		},
	},
};
</script>

<style scoped></style>
