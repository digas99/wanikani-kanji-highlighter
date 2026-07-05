<template>
	<div v-if="sections.length">
		<div id="sd-popupDetails_CardsSection" class="sd-popupDetails_anchor"></div>

		<div
			v-for="section in sections"
			:key="section.key"
			class="sd-detailsPopup_sectionContainer subjects-list"
		>
			<strong class="sd-popupDetails_title">{{ section.title }} ({{ section.items.length }})</strong>

			<TilesList
				:values="section.items"
				:use-router="false"
				@tile-click="onTileClick"
			/>
		</div>
	</div>
</template>

<script>
import TilesList from '@/components/Subjects/TilesList.vue';
import { getCardSections } from '@/utils/scripts/subjectDetailsPopup';

export default {
	name: 'SubjectDisplayRelatedCards',

	components: {
		TilesList,
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
	},

	emits: ['open-subject'],

	computed: {
		sections() {
			return getCardSections(this.item, this.relatedSubjects);
		},
	},

	methods: {
		onTileClick(subject) {
			if (subject?.id != null) this.$emit('open-subject', subject.id);
		},
	},
};
</script>
