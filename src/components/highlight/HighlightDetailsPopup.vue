<template>
	<div
		v-if="state.item && state.visible"
		class="wkh-details-root"
		:class="state.focused ? 'focused' : 'collapsed'"
		:style="rootStyle"
	>
		<SubjectDisplay
			:item="state.item"
			:focused="state.focused"
			:compact="!state.focused"
			:popup-width="state.width"
			:show-strokes="state.showStrokes"
			:autoplay-audio="state.autoplayAudio"
			:scroll-top-on-mount="false"
			:highlight-style-vars="state.highlightStyleVars"
			:popup-chrome="true"
			:related-subjects="state.relatedSubjects"
			:can-go-back="canGoBack"
			highlight-click-mode
			@highlight-subject="onHighlightSubject"
			@close="hidePopup"
			@back="onBack"
			@open-subject="onOpenSubject"
			@copy-subject="onCopySubject"
			@popup-hover="setHovering"
		/>
	</div>
</template>

<script>
import SubjectDisplay from '@/components/Subjects/SubjectDisplay/SubjectDisplay.vue';
import {
	popupState,
	setHovering,
	hidePopup,
	copySubjectCharacters,
	canNavigateBack,
} from '@/utils/highlight/detailsPopupState';
import {
	openHighlightedSubject,
	openHighlightedSubjectById,
	navigatePopupHistoryBack,
} from '@/utils/highlight/detailsPopupSubject';

export default {
	name: 'HighlightDetailsPopup',

	components: {
		SubjectDisplay,
	},

	computed: {
		state() {
			return popupState;
		},
		canGoBack() {
			return canNavigateBack();
		},
		rootStyle() {
			return {
				'--default-color': '#2a2d48',
				'--radical-tag-color': '#00a1f1',
				'--kanji-tag-color': '#f100a1',
				'--vocabulary-tag-color': '#a100f1',
				'--wanikani': '#f100a1',
				'--wanikani-sec': '#00aaff',
				'--detailsPopup-opacity': String(this.state.opacity),
				'--detailsPopup-width': `${this.state.width}px`,
				...this.state.srsAppearanceVars,
			};
		},
	},

	methods: {
		setHovering,
		hidePopup,
		onHighlightSubject({ value, type }) {
			void openHighlightedSubject(value, type);
		},
		onOpenSubject(subjectId) {
			void openHighlightedSubjectById(subjectId);
		},
		onBack() {
			void navigatePopupHistoryBack();
		},
		async onCopySubject(subject) {
			await copySubjectCharacters(subject);
		},
	},
};
</script>

<style>
/* Collapsed: native v1.5 .sd-detailsPopup styles (fixed 150×170, bottom-right). */
.wkh-details-root.collapsed {
	position: static;
	width: auto;
	height: auto;
	box-shadow: none;
	overflow: visible;
	pointer-events: none;
}

.wkh-details-root.collapsed .subject-details,
.wkh-details-root.collapsed .sd-detailsPopup,
.wkh-details-root.collapsed .sd-detailsPopup > div {
	pointer-events: all;
}

.wkh-details-root {
	--wkh-details-expand-ease: cubic-bezier(0.22, 1, 0.36, 1);
	--wkh-details-expand-duration: 0.55s;
	transition:
		width var(--wkh-details-expand-duration) var(--wkh-details-expand-ease),
		height var(--wkh-details-expand-duration) var(--wkh-details-expand-ease),
		top var(--wkh-details-expand-duration) var(--wkh-details-expand-ease),
		right var(--wkh-details-expand-duration) var(--wkh-details-expand-ease),
		bottom var(--wkh-details-expand-duration) var(--wkh-details-expand-ease),
		box-shadow var(--wkh-details-expand-duration) var(--wkh-details-expand-ease),
		opacity 0.35s ease;
}

.wkh-details-root.focused {
	position: fixed;
	z-index: 2147483647;
	top: 0 !important;
	bottom: 0 !important;
	right: 0 !important;
	left: auto;
	width: var(--detailsPopup-width);
	height: 100vh !important;
	max-height: 100vh;
	opacity: 1;
	box-shadow: -3px 0 12px rgba(0, 0, 0, 0.35);
	display: flex;
	flex-direction: column;
	background-color: var(--default-color);
	transform-origin: bottom right;
	overflow: hidden;
}

.wkh-details-root.focused .subject-details {
	flex: 1 1 auto;
	min-height: 0;
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}

.wkh-details-root.focused .sd-detailsPopup {
	position: static !important;
	width: 100% !important;
	height: 100% !important;
	box-shadow: none !important;
	opacity: 1 !important;
	flex: 1 1 auto;
	min-height: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.wkh-details-root.focused .sd-detailsPopup.sd-focusPopup {
	flex: 1 1 auto;
	min-height: 0;
}

.wkh-details-root.focused .sd-focusPopup_kanji {
	flex: 0 0 auto;
	width: 100% !important;
	min-height: unset !important;
	padding-bottom: 22px !important;
	background-color: var(--default-color) !important;
}

.wkh-details-root.focused .sd-popupDetails_detailedInfoWrapper {
	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
}

.wkh-details-root.focused .sd-popupDetails_details {
	flex: 1 1 auto;
}

.wkh-details-root.focused .sd-popupDetails_quickStats {
	position: sticky;
	bottom: -20px;
	width: 100%;
	flex-shrink: 0;
	margin-top: auto;
}

.wkh-details-root.focused .sd-popupDetails_quickStats > ul {
	margin-right: unset;
}
</style>
