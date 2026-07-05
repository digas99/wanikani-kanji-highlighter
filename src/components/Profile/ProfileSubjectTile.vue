<template>
	<SubjectTile
		:item="item"
		:tile-style="computedTileStyle"
		:show-reviews-info="showReviewsInfo"
		:height="25"
		:width="25"
		:invert-characters="styleOptions.invertCharacters"
		:title="tileTitle"
	/>
</template>

<script>
import SubjectTile from '@/components/Subjects/SubjectTile.vue';

export default {
	name: 'ProfileSubjectTile',

	components: {
		SubjectTile,
	},

	props: {
		item: {
			type: Object,
			required: true,
		},
		styleOptions: {
			type: Object,
			required: true,
		},
		showReviewsInfo: {
			type: Boolean,
			default: true,
		},
	},

	computed: {
		computedTileStyle() {
			const style = {
				opacity: this.styleOptions.opacity ?? 1,
				color: this.styleOptions.color,
			};

			if (this.styleOptions.background) {
				style.background = this.styleOptions.background;
			} else if (this.styleOptions.backgroundColor) {
				style.backgroundColor = this.styleOptions.backgroundColor;
			}

			return style;
		},
		tileTitle() {
			const parts = [this.item.meanings?.[0]?.meaning || this.item.characters || 'Subject'];
			if (this.item.isHidden) parts.push('Unavailable');
			else if (this.item.isLocked) parts.push('Locked');
			else if (this.item.srsKey >= 0) parts.push(`SRS ${this.item.srsKey}`);
			return parts.join(' · ');
		},
	},
};
</script>
