<template>
	<div class="container subject">
		<SubjectDisplay v-if="item" :item="item" />
	</div>
</template>

<script>
import { getWKManager } from '@/lib/apiClient';

import SubjectDisplay from '@/components/Subjects/SubjectDisplay/SubjectDisplay.vue';

export default {
	name: 'Subject',
	components: {
		SubjectDisplay
	},

	data() {
		return {
			id: parseInt(this.$route.params.id),
			wkManager: null,
			item: null,
		};
	},

	created() {
		this.wkManager = getWKManager();

		this.wkManager.getSubjectsById(this.id);

		this.wkManager.events.on('get:subjects', ({ state, data }) => {
			if (this.quitFetch) return;

			console.log(data);
			this.item = data[0];
		});
	},

	beforeUnmount() {
		this.wkManager.events.removeListener('get:subjects');
	}
};
</script>

<style scoped></style>

<style>
.subject .sd-detailsPopup {
	width: 100% !important;
	border-top: 4px solid;
	z-index: unset !important;
	position: relative !important;
}

.subject .sd-focusPopup_kanji {
	min-height: 140px !important;
	border-bottom: 2px solid white;
	transition: unset;
}

.subject .sd-popupDetails_details {
	padding: 15px;
	position: relative;
}

.subject .sd-popupDetails_detailedInfoWrapper {
	height: 360px !important;
	background-color: var(--default-color);
}
</style>