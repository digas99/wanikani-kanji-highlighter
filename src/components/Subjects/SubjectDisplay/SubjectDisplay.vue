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
					:back-label="backLabel"
					@close="$emit('close')"
					@back="$emit('back')"
					@scroll-top="scrollToTop"
					@side-panel="$emit('side-panel')"
				/>
				<p v-if="compact && primaryMeaning" class="sd-smallDetailsPopupKanjiTitle">
					{{ primaryMeaning }}
				</p>
				<div class="sd-popupDetails_kanjiHeader" :style="kanjiHeaderStyle">
					<!-- click to copy the word (WaniKani's page is in the lookup links) -->
					<button
						type="button"
						class="sd-copyCharacters"
						:title="copyTitle"
						@click="copyCharacters"
					>
						<SubjectCharacters :item="item" :height="80" :width="80" class="sd-detailsPopup_kanji" />
						<span v-if="copied" class="sd-copiedBadge" role="status">Copied!</span>
					</button>
					<ul class="sd-popupDetails_readings">
						<!-- kana vocabulary: the word with its pitch accent (when known) -->
						<li v-if="item.type === 'kana_vocabulary'" class="sd-popupDetails_readings_row">
							<SubjectPitchReading :item="item" only-with-pitch />
						</li>
						<li v-if="!item.readings && !compact" class="sd-popupDetails_readings_row">
							{{ primaryMeaning }}
						</li>
						<template v-else>
							<!-- the reading, with its pitch accent drawn on it (when known) -->
							<li v-if="item.type === 'vocabulary'" class="sd-popupDetails_readings_row">
								<SubjectPitchReading :item="item" />
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

				<div class="sd-popupDetails_details">
					<div id="sd-popupDetails_InfoSection" class="sd-popupDetails_anchor"></div>

					<div class="sd-infoCard">
						<div class="sd-infoCard_top">
							<!-- meanings, then the part of speech under them (like a dictionary entry) -->
							<div class="sd-infoCard_heading">
								<strong class="sd-popupDetails_kanjiTitle">{{ subjectDisplay.joinMeanings(item) }}</strong>
								<div v-if="item.parts_of_speech?.length" class="sd-popupDetails_partsOfSpeech">
									{{ subjectDisplay.partsOfSpeech(item) }}
								</div>
							</div>
							<button
								v-if="item.pronunciation_audios?.length"
								type="button"
								class="sd-iconButton sd-detailsPopup_clickable sd-detailsPopup_subjectAudio"
								title="Subject Audio"
								@click="playAudio(item.pronunciation_audios[0].url)"
							>
								<img :src="SoundIcon" alt="Play audio">
							</button>
						</div>
						<div class="sd-chipRow">
							<!-- extension popup only (chipLinks): each chip opens its subjects list -->
							<span
								class="sd-chip"
								:class="{ 'sd-chip-link': chipLinks }"
								:style="{ '--chip-color': typeColor }"
								:title="chipLinks ? `All ${subjectTypeLabel.toLowerCase()} subjects of level ${item.level}` : null"
								@click="chipLinks && openChipList(levelListRoute)"
							>
								Level {{ item.level }} · {{ subjectTypeLabel }}
							</span>
							<span
								class="sd-chip"
								:class="{ 'sd-chip-link': chipLinks && srsListRoute }"
								:style="{ '--chip-color': srsSection.color }"
								:title="chipLinks && srsListRoute
									? (item.hidden_at ? 'All legacy subjects (no longer in lessons or reviews)' : `All your ${srsSection.text} subjects`)
									: srsSection.title"
								@click="chipLinks && srsListRoute && openChipList(srsListRoute)"
							>
								{{ srsSection.text }}
							</span>
							<!-- you keep getting it wrong (troubleSubjects.ts); popup: opens the list of them -->
							<span
								v-if="trouble"
								class="sd-chip sd-chip-trouble"
								:class="{ 'sd-chip-link': chipLinks, serious: trouble.serious }"
								:title="troubleTitle"
								@click="chipLinks && openChipList({ name: 'Trouble' })"
							>
								Trouble · {{ trouble.part === 'both' ? 'meaning & reading' : trouble.part }}
							</span>
							<span v-if="schoolGradesLine && !chipLinks" class="sd-chip sd-chip-plain" :title="isWord ? WORD_GRADES_TITLE : 'JLPT, Jōyō'">
								{{ schoolGradesLine }}
							</span>
							<!-- the JLPT & Jōyō page, on that list, the level marked (kanji and words) -->
							<span
								v-for="grade in chipLinks ? schoolGradeLinks : []"
								:key="grade.label"
								class="sd-chip sd-chip-plain sd-chip-link"
								:title="`${isWord ? `${WORD_GRADES_TITLE}. ` : ''}Your ${grade.label} progress, kanji and words`"
								@click="openChipList(grade.route)"
							>
								{{ grade.label }}
							</span>
						</div>
						<div v-if="lookupEntries.length" class="sd-lookupRow" aria-label="Look up on other sites">
							<a
								v-for="entry in lookupEntries"
								:key="entry.id"
								:href="entry.href"
								target="_blank"
								rel="noopener noreferrer"
								class="sd-lookupLink"
								:title="`Search “${entry.text}” on ${entry.name}`"
							>
								{{ entry.name }}<span aria-hidden="true">↗</span>
							</a>
						</div>
						<!-- the pages read with it (page history): the card's footer -->
						<SubjectDisplaySeenOnPages :item="item" :link-pages="chipLinks" />
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
						<SubjectMnemonicImage v-if="item.type === 'radical'" :item="item" />
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
						:loading="relatedLoading"
						:context-shows-in-page="rightClickShowsInPage"
						@open-subject="id => $emit('open-subject', id)"
					/>

					<div v-if="item.context_sentences" class="sd-detailsPopup_sectionContainer">
						<strong class="sd-popupDetails_title">Context Sentences</strong>
						<ul
							v-for="sentence in item.context_sentences"
							:key="sentence.ja"
							class="sd-detailsPopup_sentencesWrapper"
						>
							<li class="sd-popupDetails_p sd-sentence">
								<span v-html="sentence.ja"></span>
								<span style="color: #b8b8b8;" v-html="sentence.en"></span>
								<button
									type="button"
									class="sd-sentence-write sd-detailsPopup_clickable"
									title="See this sentence handwritten (stroke order)"
									@click.stop="handwritingSentence = sentence"
								>
									<SentenceWriteIcon />
								</button>
							</li>
						</ul>
					</div>
					<!-- sentences from the pages you read (Keep example sentences) -->
					<!-- its cards come after the details' highlighting ran (and change): highlighted again -->
					<SubjectDisplayReadingSentences
						:item="item"
						:link-library="chipLinks"
						@handwriting="handwritingSentence = $event"
						@content-changed="applyContentHighlights"
					/>
					<SentenceHandwriting
						v-if="handwritingSentence"
						:sentence="handwritingSentence.ja"
						:translation="handwritingSentence.en"
						@close="handwritingSentence = null"
					/>

					<SubjectDisplayReviewStatistics v-if="showExtendedSections" :item="item" />
					<SubjectDisplayAssignmentTimestamps v-if="showExtendedSections" :item="item" />
				</div>

				<div class="sd-popupDetails_quickStats">
					<ul style="display: inline-flex !important;">
						<li v-if="statsLoading && !hasReviewActivity" class="sd-quickStats_loading" aria-label="Loading review stats">
							<span class="sd-shimmer"></span>
							<span class="sd-shimmer"></span>
							<span class="sd-shimmer"></span>
						</li>
						<li v-else-if="!reviewStats || !hasReviewActivity" style="color: #cbcbcb;">
							{{ noStatsLabel }}
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
import SentenceHandwriting from '@/components/Subjects/SubjectDisplay/SentenceHandwriting.vue';
import SubjectCharacters from '@/components/Subjects/SubjectCharacters.vue';
import SubjectPitchReading from '@/components/Subjects/SubjectDisplay/SubjectPitchReading.vue';
import SubjectMnemonicImage from '@/components/Subjects/SubjectDisplay/SubjectMnemonicImage.vue';
import SubjectDisplayPopupControls from '@/components/Subjects/SubjectDisplay/SubjectDisplayPopupControls.vue';
import SubjectDisplaySectionNav from '@/components/Subjects/SubjectDisplay/SubjectDisplaySectionNav.vue';
import SubjectDisplayRelatedCards from '@/components/Subjects/SubjectDisplay/SubjectDisplayRelatedCards.vue';
import SubjectDisplayReviewStatistics from '@/components/Subjects/SubjectDisplay/SubjectDisplayReviewStatistics.vue';
import SubjectDisplayAssignmentTimestamps from '@/components/Subjects/SubjectDisplay/SubjectDisplayAssignmentTimestamps.vue';
import SubjectDisplaySeenOnPages from '@/components/Subjects/SubjectDisplay/SubjectDisplaySeenOnPages.vue';
import SubjectDisplayReadingSentences from '@/components/Subjects/SubjectDisplay/SubjectDisplayReadingSentences.vue';
import SentenceWriteIcon from '@/components/Subjects/SubjectDisplay/SentenceWriteIcon.vue';

import { srsStages, subjectDisplay, typeColors } from '@/utils/scripts/wanikani';
import { buildLookupUrl, lookupQueryText, sanitizeLookupLinks } from '@/utils/scripts/lookupLinks';
import { correctnessColor } from '@/utils/scripts/common';
import { useSettingsStore } from '@/stores/settings';
import { DEFAULT_HIGHLIGHT_STYLE_VARS } from '@/utils/highlight/highlightStyleVars';
import {
	applySubjectDetailsHighlights,
	clearSubjectDetailsHighlights,
} from '@/utils/highlight/subjectDetailsHighlight';
import { HIGHLIGHT_MARK_CLASS, highlightValueOf } from '@/utils/highlight/highlighter';
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
import { troubleOf, troubleText } from '@/utils/scripts/troubleSubjects';

import SoundIcon from '@/assets/icons/subjectDetails/volume.png';
import CheckmarkIcon from '@/assets/icons/subjectDetails/checkmark.png';
import BookIcon from '@/assets/icons/subjectDetails/language.png';
import EyeIcon from '@/assets/icons/subjectDetails/eye.png';

/** where a word's JLPT level / Jōyō grade come from (vocabSchoolGrades.ts) */
const WORD_GRADES_TITLE = 'JLPT: Jonathan Waller\'s lists (unofficial). Jōyō: the grade of the word\'s hardest kanji';

export default {
	name: 'SubjectDisplay',

	components: {
		KanjiDrawPlayer,
		SentenceHandwriting,
		SubjectCharacters,
		SubjectPitchReading,
		SubjectMnemonicImage,
		SubjectDisplayPopupControls,
		SubjectDisplaySectionNav,
		SubjectDisplayRelatedCards,
		SubjectDisplayReviewStatistics,
		SubjectDisplayAssignmentTimestamps,
		SubjectDisplaySeenOnPages,
		SubjectDisplayReadingSentences,
		SentenceWriteIcon,
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
		/** Related subjects / review stats are still loading: show placeholders. */
		relatedLoading: Boolean,
		statsLoading: Boolean,
		/** Extension popup: right-click on a related subject shows it in the web page. */
		rightClickShowsInPage: Boolean,
		/** Settings → Lookup links: buttons to search this subject on other sites. */
		lookupLinks: {
			type: Array,
			default: () => [],
		},
		canGoBack: Boolean,
		/** Extension popup: the level / SRS / school chips open their subjects list. */
		chipLinks: Boolean,
		/** Characters of the subject Back returns to. */
		backLabel: {
			type: String,
			default: '',
		},
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
		'side-panel',
	],

	data() {
		return {
			WORD_GRADES_TITLE,
			/** Context sentence shown in the handwriting popup. */
			handwritingSentence: null,
			SoundIcon,
			CheckmarkIcon,
			BookIcon,
			EyeIcon,
			activeSection: 'Info',
			/** "Copied!" shows briefly after clicking the characters */
			copied: false,
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
		noStatsLabel() {
			const assignment = this.item?.assignment;
			if (assignment?.srs_stage == null) return 'Locked';
			if (!assignment.started_at && !assignment.passed_at && !(assignment.srs_stage > 0)) return 'Lesson not done yet';
			return 'No reviews yet';
		},
		hasRelatedCards() {
			return getCardSections(this.item, this.relatedSubjects).length > 0;
		},
		hasTimestamps() {
			// locked subjects have an empty assignment object: no tab without any date
			const timestamps = buildAssignmentTimestamps(this.item?.assignment);
			return Boolean(timestamps && Object.values(timestamps).some(Boolean));
		},
		subjectTypeLabel() {
			const label = getSubjectType(this.item).split('_').join(' ');
			return label.charAt(0).toUpperCase() + label.slice(1);
		},
		typeColor() {
			return typeColors[getSubjectType(this.item)] ?? '#888888';
		},
		/** What clicking the characters copies: the word, or the meaning (image-only radicals). */
		copyText() {
			return this.item?.characters || this.primaryMeaning || '';
		},
		copyTitle() {
			return this.copyText ? `Click to copy "${this.copyText}"` : '';
		},
		lookupEntries() {
			return sanitizeLookupLinks(this.lookupLinks)
				.map(link => ({
					id: link.id,
					name: link.name,
					href: buildLookupUrl(link, this.item),
					text: lookupQueryText(link, this.item),
				}))
				.filter(entry => entry.href);
		},
		/** a subject you keep getting wrong (from its own statistics) */
		trouble() {
			return troubleOf(this.item?.reviews, this.item?.assignment?.srs_stage);
		},
		troubleTitle() {
			if (!this.trouble) return null;
			const text = troubleText(this.trouble);
			return this.chipLinks ? `${text}\nClick for all your trouble subjects.` : text;
		},
		schoolGradesLine() {
			return formatSubjectSchoolGrades(this.item);
		},
		/** Chip → list routes (used when chipLinks is on, i.e. in the extension popup). */
		levelListRoute() {
			return {
				name: 'Subjects',
				query: { type: 'level', level: String(this.item.level), subjectType: getSubjectType(this.item) },
			};
		},
		srsListRoute() {
			if (this.item.hidden_at) return { name: 'Subjects', query: { type: 'legacy' } };
			const stage = this.item.assignment?.srs_stage;
			if (stage == null || stage < 0 || stage > 9) return null;
			return { name: 'Subjects', query: { id: String(stage), type: 'srs' } };
		},
		isWord() {
			const type = getSubjectType(this.item);
			return type === 'vocabulary' || type === 'kana_vocabulary';
		},
		/** "N5" → jlpt n5, "Grade 1" → joyo g1 (the school list pages' grade keys). */
		schoolGradeLinks() {
			const links = [];
			const jlpt = String(this.item.jlpt ?? '').match(/N(\d)/i)?.[1];
			if (jlpt) links.push({ label: `N${jlpt}`, route: { name: 'School', query: { school: 'jlpt', grade: `n${jlpt}` } } });
			const joyo = String(this.item.joyo ?? '').match(/(\d)/)?.[1];
			if (joyo) {
				links.push({
					label: this.item.joyo,
					route: { name: 'School', query: { school: 'joyo', grade: `g${joyo}` } },
				});
			}
			return links;
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
		/** The compact in-page preview (not the expanded panel / popup Subject page). */
		isCompactPreview() {
			return this.popupChrome && !this.focused;
		},
		/** Longest reading line shown in the compact header (vocab reading, or ON / KUN row). */
		compactReadingText() {
			const item = this.item;
			if (!item?.readings) return '';
			const type = getSubjectType(item);
			if (type === 'vocabulary' || type === 'kana_vocabulary') return subjectDisplay.readings(item);
			const rows = [subjectDisplay.onyomiReadings(item), subjectDisplay.kunyomiReadings(item)];
			return rows.reduce((longest, row) => (row.length > longest.length ? row : longest), '');
		},
		effectivePopupWidth() {
			if (this.focused) return this.popupWidth;
			return getCompactPopupWidthPx(this.item?.characters, this.popupWidth, {
				meaning: this.primaryMeaning,
				reading: this.compactReadingText,
			});
		},
		kanjiHeaderStyle() {
			const size = getPopupKanjiFontSizePx(this.item?.characters, { compact: this.isCompactPreview });
			return {
				'--popup-kanji-font-size': `${size}px`,
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
				// Fit the content instead of the fixed 170px box: kana-only vocab has
				// a single line, kanji have ON + KUN rows, long readings wrap.
				style.height = 'auto';
				style.maxHeight = '60vh';
				style.paddingBottom = '12px';
				style.overflow = 'hidden';
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
		// only the extension popup's Subject page scrolls the window
		if (!this.popupChrome) window.addEventListener('scroll', this.onWindowScroll, { passive: true });
	},

	beforeUnmount() {
		if (this.$el) clearSubjectDetailsHighlights(this.$el);
		document.removeEventListener('wkh:details-scroll-top', this.scrollToTop);
		document.removeEventListener('wkh:details-scroll-section', this.onExternalScrollSection);
		clearTimeout(this.copiedTimer);
		document.removeEventListener('wkh:details-nav-section', this.onExternalNavSection);
		window.removeEventListener('scroll', this.onWindowScroll);
	},

	methods: {
		async copyCharacters() {
			const text = this.copyText;
			if (!text) return;
			let ok = false;
			try {
				await navigator.clipboard.writeText(text);
				ok = true;
			} catch {
				// the async clipboard needs a secure page (http sites): the older way still works there
				const area = document.createElement('textarea');
				area.value = text;
				area.setAttribute('readonly', '');
				area.style.cssText = 'position:fixed;top:-1000px;opacity:0';
				document.body.appendChild(area);
				area.select();
				try { ok = document.execCommand('copy'); } catch { ok = false; }
				area.remove();
			}
			if (!ok) return;
			this.copied = true;
			clearTimeout(this.copiedTimer);
			this.copiedTimer = setTimeout(() => { this.copied = false; }, 1200);
		},
		/** Only reachable with chipLinks (the extension popup has a router; pages don't). */
		openChipList(route) {
			if (route && this.$router) this.$router.push(route);
		},
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
		/**
		 * The in-page panel scrolls inside its own wrapper; the extension popup's
		 * Subject page scrolls the whole window. Pick whichever actually scrolls.
		 */
		wrapperScrolls() {
			const wrapper = this.$refs.detailedInfoWrapper;
			return Boolean(wrapper && wrapper.scrollHeight > wrapper.clientHeight + 1);
		},
		/** Distance from the viewport top hidden by fixed/sticky bars (top bar + section nav). */
		scrollOffset() {
			const wrapper = this.$refs.detailedInfoWrapper;
			const navHeight = wrapper?.querySelector('.sd-popupDetails_navbar')?.offsetHeight ?? 0;
			if (this.wrapperScrolls()) {
				return wrapper.getBoundingClientRect().top + navHeight;
			}
			const topbar = parseFloat(
				getComputedStyle(document.documentElement).getPropertyValue('--topbar-height'),
			) || 0;
			return topbar + navHeight;
		},
		scrollToTop() {
			if (this.wrapperScrolls()) {
				this.$refs.detailedInfoWrapper.scrollTo({ top: 0, behavior: 'smooth' });
			} else {
				window.scrollTo({ top: 0, behavior: 'smooth' });
			}
			this.activeSection = 'Info';
		},
		scrollToSection(section) {
			const wrapper = this.$refs.detailedInfoWrapper;
			if (!wrapper) return;

			const anchor = wrapper.querySelector(`#sd-popupDetails_${section}Section`);
			if (!(anchor instanceof HTMLElement)) return;

			const delta = anchor.getBoundingClientRect().top - this.scrollOffset();
			if (this.wrapperScrolls()) {
				wrapper.scrollTo({ top: wrapper.scrollTop + delta, behavior: 'smooth' });
			} else {
				window.scrollTo({ top: window.scrollY + delta, behavior: 'smooth' });
			}
			this.activeSection = section;
		},
		/** Active tab = last section whose anchor has reached the top of the visible area. */
		updateActiveSection() {
			const wrapper = this.$refs.detailedInfoWrapper;
			if (!wrapper) return;

			const limit = this.scrollOffset() + 24;
			let active = 'Info';
			for (const section of ['Info', 'Cards', 'Statistics', 'Timestamps']) {
				const anchor = wrapper.querySelector(`#sd-popupDetails_${section}Section`);
				if (anchor instanceof HTMLElement && anchor.getBoundingClientRect().top <= limit) {
					active = section;
				}
			}
			this.activeSection = active;
		},
		onDetailsScroll() {
			this.updateActiveSection();
		},
		onWindowScroll() {
			if (!this.wrapperScrolls()) this.updateActiveSection();
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

			// a conjugated word: the word it is (話して → 話す)
			const value = highlightValueOf(span);
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

<style scoped>
.sd-quickStats_loading {
	display: flex !important;
	gap: 12px;
	align-items: center;
}

.sd-quickStats_loading .sd-shimmer {
	width: 46px;
	height: 14px;
}
</style>
