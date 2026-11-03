<template>
	<span v-if="item.characters">{{ item.characters }}</span>
	<img v-else-if="imageUrl" :style="{ width: width + 'px', height: height + 'px', filter: 'invert(1)' }"
		:src="imageUrl" :alt="item.meaning || 'radical'" />
</template>

<script>
export default {
	name: 'SubjectCharacters',

	props: {
		item: {
			type: Object,
			required: true
		},
		height: {
			type: Number,
			default: 22
		},
		width: {
			type: Number,
			default: 22
		}
	},

	computed: {
		/** Image-only radicals: prefer the SVG, fall back to any image instead of crashing. */
		imageUrl() {
			const images = this.item.character_images;
			if (!Array.isArray(images) || !images.length) return null;
			const image = images.find(img => img.content_type === 'image/svg+xml')
				?? images.find(img => img.content_type === 'image/png')
				?? images[0];
			return image?.url ?? null;
		},
	},
};
</script>
