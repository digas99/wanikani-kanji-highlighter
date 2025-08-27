<template>
	<RouterLink :to="{ name: 'Subjects' }" class="subject-tile" :data-item-id="item.id">
		<span v-if="item.characters">{{ item.characters }}</span>
		<img v-else-if="item.character_images" :style="{ width: width + 'px', height: height + 'px' }"
			:src="item.character_images.find(img => img.content_type === 'image/svg+xml').url" :alt="item.characters" />
	</RouterLink>
</template>

<script>
export default {
	name: 'SubjectTile',

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
}
</script>

<style scoped>
.subject-tile {
	color: inherit;
	text-decoration: none;
}

img {
	filter: invert(1);
}
</style>