<template>
	<template v-if="focused">
		<div
			id="sd-detailsPopupCloseX"
			class="sd-detailsPopupButton sd-detailsPopup_clickable"
			title="Close (X)"
			@click="$emit('close')"
		>
			<img :src="icons.close" alt="Close">
		</div>
		<div
			id="sd-detailsPopupGoBack"
			class="sd-detailsPopupButton sd-detailsPopup_clickable"
			:class="{ 'sd-detailsPopup_faded': !canGoBack }"
			title="Go back (B)"
			@click="onBack"
		>
			<img :src="icons.back" alt="Go back">
		</div>
		<div
			id="sd-detailsPopupGoUp"
			class="sd-detailsPopupButton sd-detailsPopup_clickable"
			title="Go up (U)"
			@click="$emit('scroll-top')"
		>
			<img :src="icons.up" alt="Go up">
		</div>
	</template>
</template>

<script>
import { popupIconUrl } from '@/utils/scripts/subjectDetailsPopup';

export default {
	name: 'SubjectDisplayPopupControls',

	props: {
		focused: {
			type: Boolean,
			default: false,
		},
		canGoBack: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['close', 'back', 'scroll-top'],

	computed: {
		icons() {
			return {
				close: popupIconUrl('/icons/search/close-medium.png'),
				back: popupIconUrl('/icons/kanjiDraw/up-arrow-thick.png'),
				up: popupIconUrl('/icons/kanjiDraw/up-arrow-thick.png'),
			};
		},
	},

	methods: {
		onBack() {
			if (this.canGoBack) this.$emit('back');
		},
	},
};
</script>
