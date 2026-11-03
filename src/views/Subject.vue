<template>
	<div class="container subject">
		<SubjectDisplay
			v-if="item"
			ref="display"
			:key="item.id"
			:item="item"
			:related-subjects="relatedSubjects"
			:popup-width="420"
			extended-details
			right-click-shows-in-page
			chip-links
			:lookup-links="lookupLinks"
			@highlight-subject="onHighlightSubject"
			@open-subject="onOpenSubject"
			@copy-subject="onCopySubject"
		/>
		<SubjectDisplaySkeleton v-else-if="loading" variant="full" />
		<p v-else class="subject-not-found">This subject could not be loaded.</p>
	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import { useSettingsStore } from '@/stores/settings';
import { copySubjectCharacters } from '@/utils/highlight/detailsPopupState';

import SubjectDisplay from '@/components/Subjects/SubjectDisplay/SubjectDisplay.vue';
import SubjectDisplaySkeleton from '@/components/Subjects/SubjectDisplay/SubjectDisplaySkeleton.vue';

export default {
	name: 'Subject',
	components: {
		SubjectDisplay,
		SubjectDisplaySkeleton,
	},

	data() {
		return {
			id: parseInt(this.$route.params.id),
			item: null,
			relatedSubjects: {},
			loading: true,
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		lookupLinks() {
			return useSettingsStore().settings.lookup?.links ?? [];
		},
	},

	created() {
		this.fetchData();
	},

	mounted() {
		document.addEventListener('keydown', this.onKeydown);
	},

	beforeUnmount() {
		document.removeEventListener('keydown', this.onKeydown);
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
			this.loading = true;

			try {
				const bundle = await this.wk.getSubjectWithRelated(id);
				// a newer navigation already started loading another subject
				if (this.id !== id || !bundle?.subject) return;

				this.item = bundle.subject;
				this.relatedSubjects = bundle.related ?? {};
			} finally {
				if (this.id === id) this.loading = false;
			}
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
		/**
		 * The details popup's shortcuts (Settings → Details popup → Key bindings): B back,
		 * U top, Y copy, I / C / S / T a section, ← / → the previous / next section.
		 */
		onKeydown(event) {
			if (!this.item || useSettingsStore().settings.kanji_details_popup?.key_bindings === false) return;
			if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
			const target = event.target;
			if (target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable)) return;

			const sections = { i: 'Info', c: 'Cards', s: 'Statistics', t: 'Timestamps' };
			const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
			if (key === 'b') this.$router.back();
			else if (key === 'u') document.dispatchEvent(new CustomEvent('wkh:details-scroll-top'));
			else if (key === 'y') void this.$refs.display?.copyCharacters();
			else if (sections[key]) document.dispatchEvent(new CustomEvent('wkh:details-scroll-section', { detail: sections[key] }));
			else if (key === 'ArrowLeft' || key === 'ArrowRight') document.dispatchEvent(new CustomEvent('wkh:details-nav-section', { detail: key }));
			else return;
			event.preventDefault();
		},
	},
};
</script>

<style scoped>
.container {
	background-color: var(--default-color);
	/* the subject view is a whole page: edge to edge, like in the side panel */
	padding-left: 0;
	padding-right: 0;
}
</style>

<style>
.subject .sd-detailsPopup {
	width: 100% !important;
	border-top: 4px solid;
	z-index: unset !important;
	position: relative !important;
	height: auto;
	box-shadow: unset !important;
}

.subject .sd-focusPopup_kanji {
	min-height: 140px !important;
	transition: unset;
}

.subject .sd-popupDetails_details {
	padding: 15px;
	position: relative;
}

.subject .sd-skeleton-full {
	position: relative !important;
	min-height: 520px;
	box-shadow: none !important;
	z-index: unset !important;
}

.subject-not-found {
	color: #cbcbcb;
	text-align: center;
	padding: 40px 16px;
}

/* Here the whole popup page scrolls (not an inner box), so the sticky section
   nav sits right under the fixed top bar instead of floating over the content. */
.subject .sd-popupDetails_detailedInfoWrapper {
	height: auto;
	overflow: visible;
	background-color: var(--default-color);
}

/* the quick-stats bar is fixed to the window: as wide as the page (not under the sidebar),
   so its stats are centered on the content */
.subject .sd-popupDetails_quickStats {
	left: 0;
	width: var(--content-width);
	box-sizing: border-box;
}

/* the quick-stats bar is fixed to the window here: keep the last section clear of it */
.subject .sd-detailsPopup .sd-popupDetails_details {
	margin-bottom: 44px !important;
}

/* the page scrolls under the fixed top bar: stick the section nav below it */
.subject .sd-popupDetails_navbar {
	top: var(--topbar-height);
}
</style>
