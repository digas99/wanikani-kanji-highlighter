<template>
	<!-- a locked subject: mark it as already known (knownSubjects.ts), or unmark it -->
	<button
		v-if="known || locked"
		type="button"
		class="known-toggle"
		:class="[variantClass, { known }]"
		:style="{ '--chip-color': known ? state.color : 'transparent', '--known-color': state.color }"
		:title="known
			? 'Known: you already know this one, so practice skips it while it\'s locked. Click to unmark it.'
			: 'Already know it? Mark it as known: practice skips it until WaniKani unlocks it.'"
		:aria-label="known ? `${KNOWN_LABEL} (click to unmark)` : 'Mark as known'"
		:aria-pressed="known ? 'true' : 'false'"
		@click.stop.prevent="toggle"
	>
		<!-- the details' card: an icon button, under the audio one -->
		<svg v-if="variant === 'icon'" viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="12" cy="12" r="9" />
			<path d="M7.8 12.3l2.9 2.9 5.5-5.9" />
		</svg>
		<template v-else>{{ known ? KNOWN_LABEL : 'I know this' }}</template>
	</button>
</template>

<script>
import { KNOWN_LABEL, isKnownSubject, isLockedSubject, setSubjectKnown, useKnownSubjects } from '@/utils/scripts/knownSubjects';

export default {
	name: 'KnownToggle',

	props: {
		subject: {
			type: Object,
			default: null,
		},
		/** 'icon': the subject details' card button; 'practice': a chip on the practice card */
		variant: {
			type: String,
			default: 'icon',
		},
	},

	data() {
		return { state: useKnownSubjects(), KNOWN_LABEL };
	},

	computed: {
		locked() {
			return isLockedSubject(this.subject);
		},
		known() {
			return isKnownSubject(this.subject, this.state.ids);
		},
		variantClass() {
			return this.variant === 'practice' ? 'practice-chip' : 'sd-iconButton sd-detailsPopup_clickable known-icon';
		},
	},

	methods: {
		toggle() {
			void setSubjectKnown(this.subject, !this.known);
		},
	},
};
</script>

<style scoped>
.known-toggle {
	font-family: inherit;
	cursor: pointer;
}

/* the details' card: a check in a circle; filled in the known color once marked */
.known-icon svg {
	width: 18px;
	height: 18px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
	pointer-events: none;
}

.known-icon:not(.known) {
	color: var(--sd-text, #fff);
	opacity: 0.55;
	transition: opacity 0.15s ease;
}

.known-icon:not(.known) svg circle {
	stroke-dasharray: 3 2.6;
}

.known-icon:not(.known):hover {
	opacity: 1;
}

.known-icon.known {
	background: var(--known-color);
	color: #fff;
}

/* the practice card's chips: filled */
.known-toggle.practice-chip {
	border: 1px solid transparent;
}

.known-toggle.practice-chip:not(.known) {
	background: transparent;
	border-color: var(--known-color);
	color: var(--known-color);
	border-style: dashed;
	opacity: 0.75;
}

.known-toggle.practice-chip:not(.known):hover {
	opacity: 1;
}
</style>
