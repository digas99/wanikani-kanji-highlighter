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

		this.fetchData();
		this.fetchInterval = setInterval(this.fetchData, 1000);
	},

	beforeUnmount() {
		clearInterval(this.fetchInterval);
	},

	methods: {
		fetchData() {
			this.wkManager.getSubjectsById(this.id, ({ state, data }) => {
				console.log(data);
				this.item = data[0];
			});
		}
	}
};
</script>

<style scoped>
.container {
	background-color: var(--default-color);
}
</style>

<style>
.subject .sd-detailsPopup {
	width: 100% !important;
	border-top: 4px solid;
	z-index: unset !important;
	position: relative !important;
	height: 100%;
	box-shadow: unset !important;
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
	height: 100%;
	background-color: var(--default-color);
}
</style>