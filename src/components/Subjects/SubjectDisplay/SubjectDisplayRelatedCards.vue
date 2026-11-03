<template>
	<!-- related subjects still loading: placeholder cards -->
	<div v-if="!sections.length && loading && placeholderCount">
		<div id="sd-popupDetails_CardsSection" class="sd-popupDetails_anchor"></div>
		<div class="sd-detailsPopup_sectionContainer">
			<span class="sd-shimmer sd-relatedTitlePlaceholder"></span>
			<ul class="sd-relatedGrid" aria-busy="true" aria-label="Loading related subjects">
				<li v-for="n in placeholderCount" :key="n" class="sd-relatedGrid_item">
					<span class="sd-shimmer sd-relatedCard_placeholder"></span>
				</li>
			</ul>
		</div>
	</div>

	<div v-else-if="sections.length" class="sd-sectionStack">
		<div id="sd-popupDetails_CardsSection" class="sd-popupDetails_anchor"></div>

		<div
			v-for="section in sections"
			:key="section.key"
			class="sd-detailsPopup_sectionContainer"
		>
			<strong class="sd-popupDetails_title">{{ section.title }} ({{ section.items.length }})</strong>

			<ul class="sd-relatedGrid">
				<li
					v-for="card in section.items.map(toCard)"
					:key="card.id"
					class="sd-relatedGrid_item"
					:class="{ wide: card.wide }"
				>
					<button
						type="button"
						class="sd-relatedCard sd-detailsPopup_clickable"
						:class="{ locked: card.locked }"
						:style="card.style"
						:title="card.tooltip"
						@click="onCardClick(card.id)"
						@contextmenu="onCardContextMenu($event, card.id)"
					>
						<span class="sd-relatedCard_chars" :style="{ '--chars': card.length }">
							<SubjectCharacters :item="card.subject" :height="26" :width="26" />
						</span>
						<span v-if="card.meaning" class="sd-relatedCard_meaning">{{ card.meaning }}</span>
						<span v-if="card.reading" class="sd-relatedCard_reading">{{ card.reading }}</span>
						<span class="sd-relatedCard_srs" :title="card.srsName"></span>
					</button>
				</li>
			</ul>
		</div>
	</div>
</template>

<script>
import SubjectCharacters from '@/components/Subjects/SubjectCharacters.vue';
import { showSubjectInPage } from '@/utils/scripts/showSubjectInPage';
import { getCardSections, getRelatedSubjectIds, getSubjectType } from '@/utils/scripts/subjectDetailsPopup';
import {
	primaryMeaning,
	primaryReading,
	srsStages,
	subjectDisplay,
	subjectSummary,
	typeColors,
} from '@/utils/scripts/wanikani';

export default {
	name: 'SubjectDisplayRelatedCards',

	components: {
		SubjectCharacters,
	},

	props: {
		item: {
			type: Object,
			required: true,
		},
		relatedSubjects: {
			type: Object,
			default: () => ({}),
		},
		loading: Boolean,
		/** Right-click opens the subject in the active tab's details popup. */
		contextShowsInPage: Boolean,
	},

	emits: ['open-subject'],

	computed: {
		sections() {
			return getCardSections(this.item, this.relatedSubjects);
		},
		placeholderCount() {
			return Math.min(getRelatedSubjectIds(this.item).length, 8);
		},
	},

	methods: {
		toCard(subject) {
			const type = getSubjectType(subject);
			const typeColor = typeColors[type] ?? '#888888';
			const stage = subject.assignment?.srs_stage;
			const locked = stage == null;
			const meaning = primaryMeaning(subject);
			// kana-only vocabulary: the characters already are the reading
			const reading = type === 'kana_vocabulary' ? '' : primaryReading(subject);
			const length = subject.characters?.length ?? 0;

			return {
				id: subject.id,
				subject,
				meaning,
				reading,
				locked,
				// words shrink to fit their card (圧倒する in one column); only the longest get two
				wide: length >= 6,
				length: Math.max(1, length),
				srsName: subjectDisplay.srsStageName(subject, srsStages),
				tooltip: `${subjectSummary(subject)} — ${subjectDisplay.srsStageName(subject, srsStages)}`,
				style: {
					'--card-type-color': typeColor,
					'--card-srs-color': subjectDisplay.srsStageColor(subject, srsStages),
				},
			};
		},
		onCardClick(id) {
			if (id != null) this.$emit('open-subject', id);
		},
		/** Extension popup only: right-click shows the subject in the web page instead. */
		async onCardContextMenu(event, id) {
			if (!this.contextShowsInPage || id == null) return;
			event.preventDefault();
			if (await showSubjectInPage(id)) return;
			this.$emit('open-subject', id);
		},
	},
};
</script>

<style scoped>
.sd-relatedGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
	gap: 6px;
	list-style: none;
	padding: 8px 0 2px;
	margin: 0;
}

.sd-relatedGrid_item {
	display: flex;
	min-width: 0;
	padding: 0 !important;
}

.sd-relatedGrid_item.wide {
	grid-column: span 2;
}

.sd-relatedCard {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 1px;
	width: 100%;
	min-width: 0;
	padding: 7px 10px 9px;
	border: none;
	/* neutral dark card; the subject type is just a thin edge */
	border-left: 2px solid var(--card-type-color);
	border-radius: 7px;
	background: rgba(0, 0, 0, 0.2);
	color: #fff;
	font-family: inherit;
	cursor: pointer;
	overflow: hidden;
	transition: background-color 0.15s ease, transform 0.15s ease;
	/* the characters' size follows the card's width (cqi) */
	container-type: inline-size;
}

.sd-relatedCard:hover,
.sd-relatedCard:focus-visible {
	background: rgba(255, 255, 255, 0.07);
	transform: translateY(-1px);
	outline: none;
}

.sd-relatedCard.locked {
	opacity: 0.6;
}

/* as big as fits the card (22px at most): long words get smaller instead of cut; the line's
   height stays the same, so the cards in a row line up */
.sd-relatedCard_chars {
	max-width: 100%;
	overflow: hidden;
	font-size: min(22px, calc((100cqi - 2px) / var(--chars, 1)));
	height: 27px;
	line-height: 27px;
	white-space: nowrap;
}

.sd-relatedCard_meaning,
.sd-relatedCard_reading {
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 11px;
	line-height: 1.3;
}

.sd-relatedCard_meaning {
	color: #f0f0f0;
	font-weight: 600;
}

.sd-relatedCard_reading {
	color: #b9bccf;
}

.sd-relatedTitlePlaceholder {
	width: 140px;
	height: 18px;
}

.sd-relatedCard_placeholder {
	width: 100%;
	height: 64px;
	border-radius: 7px;
}

/* SRS stage strip along the bottom of the card */
.sd-relatedCard_srs {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 3px;
	background: var(--card-srs-color);
}
</style>
