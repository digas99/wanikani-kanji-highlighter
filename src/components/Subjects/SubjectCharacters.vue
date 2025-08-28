<template>
	<span v-if="item.characters">{{ item.characters }}</span>
	<img v-else-if="item.character_images" :style="{ width: width + 'px', height: height + 'px', filter: 'invert(1)' }"
		:src="item.character_images.find(img => img.content_type === 'image/svg+xml').url" :alt="item.characters" />
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
};
</script>

<style scoped></style>