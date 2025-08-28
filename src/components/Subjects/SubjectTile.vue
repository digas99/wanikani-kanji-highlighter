<template>
	<RouterLink :to="{ name: 'Subject', params: { id: item.id } }" class="subject-tile" :data-item-id="item.id">
		<SubjectCharacters :item="item" :height="height" :width="width" />
	</RouterLink>
</template>

<script>
import SubjectCharacters from '@/components/Subjects/SubjectCharacters.vue';

export default {
	name: 'SubjectTile',
	components: {
		SubjectCharacters
	},

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