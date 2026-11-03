<template>
	<template v-if="focused">
		<div
			id="sd-detailsPopupCloseX"
			class="sd-detailsPopupButton sd-detailsPopup_clickable"
			title="Close (X)"
			@click="$emit('close')"
		>
			<img :src="icons.close" alt="Close">
		</div>
		<div
			v-if="sidePanelAvailable"
			id="sd-detailsPopupSidePanel"
			class="sd-detailsPopupButton sd-detailsPopup_clickable"
			title="Show subject details in the browser side panel"
			@click="$emit('side-panel')"
		>
			<img :src="icons.sidePanel" alt="Open in side panel">
		</div>
		<!-- Lock / Keep open / Key bindings, without the keys -->
		<div ref="menuWrapper" class="sd-detailsPopupMenuWrapper" :class="{ 'sd-noSidePanel': !sidePanelAvailable }">
			<div
				id="sd-detailsPopupMenuButton"
				class="sd-detailsPopupButton sd-detailsPopup_clickable"
				:class="{ 'sd-detailsPopupMenuButton_active': state.locked || state.fixed }"
				title="Options"
				role="button"
				:aria-expanded="menuOpen"
				@click="menuOpen = !menuOpen"
			>
				<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
			</div>
			<div v-if="menuOpen" class="sd-detailsPopupMenu" role="menu">
				<div class="sd-detailsPopupMenu_title">Options</div>
				<button
					v-for="option in options"
					:key="option.id"
					type="button"
					role="menuitemcheckbox"
					class="sd-detailsPopupMenu_option"
					:aria-checked="option.on"
					@click="option.toggle"
				>
					<span class="sd-detailsPopupMenu_label">
						{{ option.label }}<kbd v-if="option.key && state.keyBindings">{{ option.key }}</kbd>
						<small>{{ option.description }}</small>
					</span>
					<span class="sd-detailsPopupMenu_switch" :class="{ on: option.on }"></span>
				</button>
			</div>
		</div>
		<div
			id="sd-detailsPopupGoBack"
			class="sd-detailsPopupButton sd-detailsPopup_clickable"
			:class="{ 'sd-detailsPopup_faded': !canGoBack, 'sd-detailsPopupGoBack_labeled': canGoBack && backLabel }"
			:title="canGoBack && backLabel ? `Back to ${backLabel} (B)` : 'Go back (B)'"
			@click="onBack"
		>
			<img :src="icons.back" alt="Go back">
			<span v-if="canGoBack && backLabel" class="sd-detailsPopupGoBack_label">{{ backLabel }}</span>
		</div>
		<div
			id="sd-detailsPopupGoUp"
			class="sd-detailsPopupButton sd-detailsPopup_clickable"
			title="Go up (U)"
			@click="$emit('scroll-top')"
		>
			<img :src="icons.up" alt="Go up">
		</div>
	</template>
</template>

<script>
import { storage } from '#imports';
import { popupIconUrl } from '@/utils/scripts/subjectDetailsPopup';
import { popupState, toggleFixed, toggleLocked } from '@/utils/highlight/detailsPopupState';

export default {
	name: 'SubjectDisplayPopupControls',

	data() {
		return {
			state: popupState,
			menuOpen: false,
		};
	},

	props: {
		focused: {
			type: Boolean,
			default: false,
		},
		canGoBack: {
			type: Boolean,
			default: false,
		},
		/** Shown next to the arrow: where Back goes. */
		backLabel: {
			type: String,
			default: '',
		},
	},

	emits: ['close', 'back', 'scroll-top', 'side-panel'],

	computed: {
		/** Firefox can't open its sidebar from a click on a web page. */
		sidePanelAvailable() {
			return import.meta.env.BROWSER !== 'firefox';
		},
		options() {
			return [
				{
					id: 'lock',
					label: 'Lock subject',
					key: 'L',
					description: 'Hovering other words won\'t change it',
					on: popupState.locked,
					toggle: toggleLocked,
				},
				{
					id: 'fix',
					label: 'Keep open',
					key: 'F',
					description: 'Clicking outside won\'t close it',
					on: popupState.fixed,
					toggle: toggleFixed,
				},
				{
					id: 'keys',
					label: 'Key bindings',
					key: '',
					description: 'Shortcut keys (L, F, X, B, U, Y…)',
					on: popupState.keyBindings,
					toggle: this.toggleKeyBindings,
				},
			];
		},
		icons() {
			return {
				sidePanel: popupIconUrl('/icons/sidebar/popout.png'),
				close: popupIconUrl('/icons/search/close-medium.png'),
				back: popupIconUrl('/icons/kanjiDraw/up-arrow-thick.png'),
				up: popupIconUrl('/icons/kanjiDraw/up-arrow-thick.png'),
			};
		},
	},

	watch: {
		menuOpen(open) {
			// on the document: it sees clicks on the page and (composed) inside the popup's shadow root
			if (open) setTimeout(() => document.addEventListener('pointerdown', this.onOutside, true));
			else document.removeEventListener('pointerdown', this.onOutside, true);
		},
		focused(isFocused) {
			if (!isFocused) this.menuOpen = false;
		},
	},

	beforeUnmount() {
		document.removeEventListener('pointerdown', this.onOutside, true);
	},

	methods: {
		onBack() {
			if (this.canGoBack) this.$emit('back');
		},
		onOutside(event) {
			if (!event.composedPath().includes(this.$refs.menuWrapper)) this.menuOpen = false;
		},
		/** Saved like the setting (Settings → Kanji Details Popup → Key Bindings). */
		async toggleKeyBindings() {
			const enabled = !popupState.keyBindings;
			popupState.keyBindings = enabled;
			const settings = (await storage.getItem('local:settings')) ?? {};
			await storage.setItem('local:settings', {
				...settings,
				kanji_details_popup: { ...(settings.kanji_details_popup ?? {}), key_bindings: enabled },
			});
		},
	},
};
</script>
