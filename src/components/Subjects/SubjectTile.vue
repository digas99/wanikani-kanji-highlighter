<template>
	<a
		href="#"
		class="subject-tile"
		:class="[
			{ 'invert-characters': invertCharacters },
			{ 'sd-detailsPopup_clickable': !useRouter },
		]"
		:data-item-id="item.id"
		:style="tileStyle"
		:title="title"
		@click="onClick"
	>
		<SubjectCharacters :item="item" :height="height" :width="width" />

		<div v-if="showReviewsInfo" class="reviews-info">
			<img
				v-if="item.assignment?.passed_at"
				class="passed-subject-check"
				src="/icons/sidebar/check.png"
				alt=""
			>
			<div
				v-else-if="reviewLabel"
				class="subject-next-review"
				:class="{ locked: item.isLocked }"
			>
				<div>{{ reviewLabel }}</div>
			</div>

			<div class="subject-passed-progress" :class="{ compact: srsKey >= 5 }">
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
		title: {
			type: String,
			default: '',
		},
	},

	computed: {
		srsKey() {
			if (typeof this.item.srsKey === 'number') return this.item.srsKey;
			const stage = this.item.assignment?.srs_stage;
			return stage == null ? -1 : Number(stage);
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
		progressFilled(index) {
			if (this.item.assignment?.passed_at) return true;
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

img {
	filter: invert(1);
}

.reviews-info {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.passed-subject-check {
	width: 14px;
	position: absolute;
	top: -3px;
	right: -5px;
	filter: invert(72%) sepia(73%) saturate(3496%) hue-rotate(87deg) brightness(106%) contrast(109%) drop-shadow(0 0 2px black);
	z-index: 1;
}

.subject-next-review {
	position: absolute;
	top: -4px;
	right: -8px;
	z-index: 1;
}

.subject-next-review div {
	font-size: 10px;
	background-color: #42f541;
	padding: 2px 3px;
	border-radius: 5px;
	color: #000;
	font-weight: 700;
}

.subject-next-review.locked div {
	background-color: #e1e1e1;
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
