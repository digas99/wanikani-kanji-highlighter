<template>
	<!-- An ⓘ button: its explanation on hover, or on click (kept open until a click elsewhere). -->
	<span class="info-tip" @mouseenter="enter" @mouseleave="leave">
		<button
			ref="button"
			type="button"
			class="info-tip-button"
			:class="{ open: shown }"
			:aria-label="label"
			:aria-expanded="shown"
			@click.stop="toggle"
		>i</button>
		<Teleport to="body">
			<div
				v-if="shown"
				ref="panel"
				class="info-tip-panel"
				:class="side"
				:style="panelStyle"
				role="tooltip"
				@mouseenter="enter"
				@mouseleave="leave"
				@click.stop
			>
				<slot></slot>
			</div>
		</Teleport>
	</span>
</template>

<script>
export default {
	name: 'InfoTip',
	props: {
		label: { type: String, default: 'More info' },
	},
	data() {
		return { hovered: false, pinned: false, side: 'below', panelStyle: {}, hideTimer: null };
	},
	computed: {
		shown() {
			return this.hovered || this.pinned;
		},
	},
	watch: {
		shown(value) {
			if (value) {
				this.$nextTick(this.place);
				document.addEventListener('click', this.onOutside, true);
				window.addEventListener('scroll', this.onScroll, true);
			} else {
				this.detach();
			}
		},
	},
	beforeUnmount() {
		clearTimeout(this.hideTimer);
		this.detach();
	},
	deactivated() {
		this.hovered = false;
		this.pinned = false;
	},
	methods: {
		enter() {
			clearTimeout(this.hideTimer);
			this.hovered = true;
		},
		leave() {
			clearTimeout(this.hideTimer);
			this.hideTimer = setTimeout(() => { this.hovered = false; }, 150);
		},
		toggle() {
			this.pinned = !this.pinned;
			if (!this.pinned) this.hovered = false;
		},
		onOutside(event) {
			if (this.$refs.panel?.contains(event.target) || this.$refs.button?.contains(event.target)) return;
			this.pinned = false;
			this.hovered = false;
		},
		onScroll(event) {
			if (this.$refs.panel?.contains(event.target)) return;
			this.place();
		},
		detach() {
			document.removeEventListener('click', this.onOutside, true);
			window.removeEventListener('scroll', this.onScroll, true);
		},
		/** under the button (above when there's no room), inside the window */
		place() {
			const button = this.$refs.button;
			const panel = this.$refs.panel;
			if (!button || !panel) return;
			const rect = button.getBoundingClientRect();
			const margin = 8;
			const width = Math.min(300, window.innerWidth - margin * 2);
			const height = panel.offsetHeight;
			const left = Math.max(margin, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - margin));
			const below = rect.bottom + 8 + height <= window.innerHeight - margin || rect.top < window.innerHeight - rect.bottom;
			this.side = below ? 'below' : 'above';
			this.panelStyle = {
				width: `${width}px`,
				left: `${left}px`,
				top: `${below ? rect.bottom + 8 : Math.max(margin, rect.top - 8 - height)}px`,
				'--info-tip-arrow': `${Math.round(rect.left + rect.width / 2 - left)}px`,
			};
		},
	},
};
</script>

<style scoped>
.info-tip {
	display: inline-flex;
	align-items: center;
	vertical-align: middle;
}
.info-tip-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	padding: 0;
	border: 1.5px solid currentColor;
	border-radius: 50%;
	background: transparent;
	/* the text colour around it (light on dark headers, grey on cards) */
	color: inherit;
	font: italic 700 11px/1 Georgia, 'Times New Roman', serif;
	cursor: pointer;
	opacity: 0.7;
	transition: opacity 0.12s, background-color 0.12s;
}
.info-tip-button:hover,
.info-tip-button.open {
	opacity: 1;
	background: color-mix(in srgb, currentColor 18%, transparent);
}
.info-tip-panel {
	position: fixed;
	z-index: 1000;
	box-sizing: border-box;
	padding: 10px 12px;
	border-radius: 10px;
	background: var(--fill-color);
	color: var(--font-color);
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22), 0 0 0 1px var(--surface-border-color);
	font-size: 12px;
	font-weight: 400;
	line-height: 1.5;
	text-align: left;
	white-space: normal;
	animation: info-tip-in 0.12s ease-out;
}
@keyframes info-tip-in {
	from { opacity: 0; }
}
.info-tip-panel::before {
	content: '';
	position: absolute;
	left: var(--info-tip-arrow, 50%);
	width: 10px;
	height: 10px;
	margin-left: -5px;
	background: var(--fill-color);
	transform: rotate(45deg);
}
.info-tip-panel.below::before {
	top: -5px;
	box-shadow: -1px -1px 0 var(--surface-border-color);
}
.info-tip-panel.above::before {
	bottom: -5px;
	box-shadow: 1px 1px 0 var(--surface-border-color);
}
.info-tip-panel :deep(p) {
	margin: 0;
}
.info-tip-panel :deep(p + p) {
	margin-top: 6px;
}
</style>
