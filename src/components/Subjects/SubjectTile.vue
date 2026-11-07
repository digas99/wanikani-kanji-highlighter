<template>
	<a
		href="#"
		class="subject-tile"
		:class="[
			{ 'invert-characters': invertCharacters },
			{ 'sd-detailsPopup_clickable': !useRouter },
			{ known },
		]"
		:data-item-id="item.id"
		:style="style"
		:title="tooltip"
		@click="onClick"
		@contextmenu="onContextMenu"
	>
		<SubjectCharacters v-if="hasDisplayData" :item="item" :height="height" :width="width" />
		<!-- subject data still loading: a placeholder the size of a character -->
		<span v-else class="tile-loading"></span>
		<span v-if="showMeaning && meaningLabel" class="tile-meaning">{{ meaningLabel }}</span>
		<!-- you keep getting it wrong (troubleSubjects.ts): a circle on the top right, in every list -->
		<span v-if="trouble" class="tile-trouble" :class="{ serious: trouble.serious }" aria-hidden="true">!</span>

		<div v-if="showReviewsInfo" class="reviews-info">
			<!-- the next review, top left inside the tile: "now" (green) or when ("10h").
			     Passed ones: their full bar says it (no time either, as before). -->
			<div
				v-if="!passed && reviewLabel"
				class="subject-next-review"
				:class="{ locked: item.isLocked, now: reviewLabel === 'now' }"
			>
				<div>{{ reviewLabel }}</div>
			</div>

			<!-- to Guru: a segment per Apprentice stage; passed (ever): full and solid, even back in Apprentice -->
			<div class="subject-passed-progress" :class="{ compact: passed }">
				<div
					v-for="index in 5"
					:key="index"
					:class="{ filled: progressFilled(index - 1) }"
				></div>
			</div>
		</div>
	</a>
</template>

<script>
import SubjectCharacters from '@/components/Subjects/SubjectCharacters.vue';
import { formatShortDuration } from '@/utils/scripts/profileSubjects';
import { primaryMeaning, subjectSummary } from '@/utils/scripts/wanikani';
import { showSubjectInPage } from '@/utils/scripts/showSubjectInPage';
import { troubleText, useTroubleSubjects } from '@/utils/scripts/troubleSubjects';
import { KNOWN_LABEL, isKnownSubject, useKnownSubjects } from '@/utils/scripts/knownSubjects';

export default {
	name: 'SubjectTile',
	components: {
		SubjectCharacters,
	},

	emits: ['click'],

	props: {
		useRouter: {
			type: Boolean,
			default: true,
		},
		item: {
			type: Object,
			required: true,
		},
		height: {
			type: Number,
			default: 22,
		},
		width: {
			type: Number,
			default: 22,
		},
		tileStyle: {
			type: Object,
			default: () => ({}),
		},
		showReviewsInfo: {
			type: Boolean,
			default: false,
		},
		invertCharacters: {
			type: Boolean,
			default: false,
		},
		showMeaning: {
			type: Boolean,
			default: false,
		},
		/** the trouble circle (off: a list's menu → Trouble info) */
		showTrouble: {
			type: Boolean,
			default: true,
		},
		title: {
			type: String,
			default: '',
		},
	},

	data() {
		return { knownState: useKnownSubjects() };
	},

	computed: {
		/** locked, marked as known (knownSubjects.ts): still a locked tile, with a line in its color */
		known() {
			return isKnownSubject(this.item, this.knownState.ids);
		},
		/** The list's style, plus the known line's color. */
		style() {
			if (this.known) return { ...this.tileStyle, '--mark-color': this.knownState.color };
			return this.tileStyle;
		},
		/** Hover text: what the subject means, since the tile only shows characters. */
		tooltip() {
			const lines = [this.title || subjectSummary(this.item)];
			// the tile shows a dot / "2h": the words, on hover
			if (this.showReviewsInfo && !this.passed && this.reviewLabel) {
				lines.push(this.reviewLabel === 'now' ? 'Review available now' : `Next review in ${this.reviewLabel}`);
			}
			if (this.trouble) lines.push(troubleText(this.trouble));
			if (this.known) lines.push(`${KNOWN_LABEL}: you already know it (still locked)`);
			return lines.join('\n');
		},
		/** the popup's trouble subjects (empty when their marks are off in the settings) */
		trouble() {
			if (!this.showTrouble || this.item?.id == null) return null;
			return useTroubleSubjects().byId.get(Number(this.item.id)) ?? null;
		},
		hasDisplayData() {
			return Boolean(this.item.characters || this.item.character_images?.length);
		},
		meaningLabel() {
			return primaryMeaning(this.item);
		},
		srsKey() {
			if (typeof this.item.srsKey === 'number') return this.item.srsKey;
			const stage = this.item.assignment?.srs_stage;
			return stage == null ? -1 : Number(stage);
		},
		/** reached Guru at some point (now, or before falling back to Apprentice) */
		passed() {
			return Boolean(this.item.assignment?.passed_at) || this.srsKey >= 5;
		},
		reviewLabel() {
			const availableAt = this.item.assignment?.available_at;
			if (!availableAt) return '';
			const delta = new Date(availableAt).getTime() - Date.now();
			return formatShortDuration(delta);
		},
	},

	methods: {
		onClick(event) {
			event.preventDefault();

			if (this.useRouter) {
				const router = this.$router;
				if (router) {
					void router.push({ name: 'Subject', params: { id: this.item.id } });
				}
				return;
			}

			this.$emit('click', this.item);
		},
		/** Right-click: show the subject in the web page's details popup (else open it here). */
		async onContextMenu(event) {
			if (!this.useRouter || this.item?.id == null) return;
			event.preventDefault();
			if (await showSubjectInPage(this.item.id)) return;
			void this.$router?.push({ name: 'Subject', params: { id: this.item.id } });
		},
		progressFilled(index) {
			if (this.passed) return true;
			return this.srsKey > index;
		},
	},
};
</script>

<style scoped>
.subject-tile {
	position: relative;
	color: inherit;
	text-decoration: none;
}

/* locked, marked as known: a line in the known color along the bottom */
.subject-tile.known::after {
	content: '';
	position: absolute;
	z-index: 2;
	left: 0;
	right: 0;
	bottom: 0;
	height: 3px;
	background: var(--mark-color);
	border-bottom-left-radius: inherit;
	border-bottom-right-radius: inherit;
	pointer-events: none;
}

.tile-loading {
	display: inline-block;
	width: 22px;
	height: 22px;
	vertical-align: middle;
	border-radius: 4px;
	background: linear-gradient(90deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.55) 50%, rgba(255, 255, 255, 0.25) 100%);
	background-size: 200% 100%;
	animation: tile-loading 1.2s linear infinite;
}

@keyframes tile-loading {
	from { background-position: 100% 0; }
	to { background-position: -100% 0; }
}

.tile-meaning {
	display: block;
	max-width: 90px;
	margin: 2px auto 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 10px;
	line-height: 1.2;
	text-shadow: none;
	opacity: 0.9;
}

img {
	filter: invert(1);
}

/* trouble: a circle on the top right (where the passed tick was), amber; red for the worst.
   Above the next review time when both are there. */
.tile-trouble {
	position: absolute;
	top: -4px;
	right: -5px;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 14px;
	height: 14px;
	border-radius: 50%;
	background: #f5a524;
	color: #2a1a00;
	font-size: 10px;
	font-weight: 900;
	line-height: 1;
	text-shadow: none;
	box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.35);
	pointer-events: none;
}

.tile-trouble.serious {
	background: #ff4d4d;
	color: #fff;
}

.reviews-info {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

/* the next review: top left, inside the tile (the top right is the trouble circle's) */
/* a tab in the corner: flush with the tile's edges, its outer corner rounded like the tile's */
.subject-next-review {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 1;
}

.subject-next-review div {
	padding: 1px 4px 2px 3px;
	border-radius: 5px 0 5px 0;
	background-color: rgba(0, 0, 0, 0.35);
	color: #fff;
	font-size: 8.5px;
	font-weight: 700;
	line-height: 1.2;
	text-shadow: none;
}

/* waiting right now: the same pill, green text */
.subject-next-review.now div {
	color: #5cff6e;
}

.subject-next-review.locked div {
	background-color: rgba(225, 225, 225, 0.85);
	color: #333;
}

.subject-passed-progress {
	position: absolute;
	width: 100%;
	height: 4px;
	bottom: 0;
	left: 0;
	border-bottom-left-radius: 6px;
	border-bottom-right-radius: 6px;
	display: flex;
	column-gap: 1px;
	overflow: hidden;
}

.subject-passed-progress.compact {
	column-gap: 0;
}

.subject-passed-progress > div {
	flex: 1;
	height: 100%;
	background-color: rgba(255, 255, 255, 0.45);
}

.subject-passed-progress > div.filled {
	background-color: #42f541;
}

.invert-characters :deep(img) {
	filter: invert(1) drop-shadow(-1px 1px 0px gray) !important;
}
</style>
