<template>
	<div class="container subject">
		<SubjectDisplay
			v-if="item"
			:key="item.id"
			:item="item"
			:related-subjects="relatedSubjects"
			:popup-width="420"
			extended-details
			@highlight-subject="onHighlightSubject"
			@open-subject="onOpenSubject"
			@copy-subject="onCopySubject"
		/>
	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import { copySubjectCharacters } from '@/utils/highlight/detailsPopupState';

import SubjectDisplay from '@/components/Subjects/SubjectDisplay/SubjectDisplay.vue';

export default {
	name: 'Subject',
	components: {
		SubjectDisplay,
	},

	data() {
		return {
			id: parseInt(this.$route.params.id),
			item: null,
			relatedSubjects: {},
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
	},

	created() {
		this.fetchData();
	},

	watch: {
		'$route.params.id'() {
			this.fetchData();
		},
	},

	methods: {
		async fetchData() {
			const id = parseInt(String(this.$route.params.id), 10);
			this.id = id;
			this.item = null;
			this.relatedSubjects = {};

			const bundle = await this.wk.getSubjectWithRelated(id);
			if (!bundle?.subject) return;

			this.item = bundle.subject;
			this.relatedSubjects = bundle.related ?? {};
		},
		async onHighlightSubject({ value, type }) {
			const subjects = await this.wk.getHighlightedSubjects([{ value, type }]);
			const next = subjects[0];
			if (next?.id != null) {
				this.$router.push({ name: 'Subject', params: { id: next.id } });
			}
		},
		onOpenSubject(subjectId) {
			this.$router.push({ name: 'Subject', params: { id: subjectId } });
		},
		async onCopySubject(subject) {
			await copySubjectCharacters(subject);
		},
	},
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
	border-bottom: 2px solid var(--surface-border-color);
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
