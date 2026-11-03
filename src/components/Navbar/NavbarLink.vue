<template>
	<li class="side-panel-tab" :data-label="icon">
		<!-- an action ("#": theme, notifications, pop out…): a plain link, never a navigation.
		     (A RouterLink to "#" goes to the current page without its query: Practice lost its
		     title and deck, a list its filters.) -->
		<component
			:is="isAction ? 'a' : 'RouterLink'"
			v-bind="isAction ? { href: '#' } : { to }"
			class="navbar_icon"
			@click="onClick"
		>
			<div>
				<img :id="icon" :src="iconSrc || `/icons/sidebar/${icon}.png`"
					:title="linkTitle" style="width: 20px;">
				<span
					v-if="info"
					class="side-panel-info-alert"
					:style="infoStyle"
				>{{ info }}</span>
			</div>
			<p style="pointer-events: none;">{{ linkLabel }}</p>
		</component>
	</li>
</template>

<script>
import { RouterLink } from 'vue-router';

export default {
	name: 'NavbarLink',
	props: {
		to: {
			type: [String, Object],
			required: true,
		},
		icon: {
			type: String,
			required: true,
		},
		/** an icon that isn't /icons/sidebar/<icon>.png (e.g. an SVG) */
		iconSrc: {
			type: String,
			default: '',
		},
		info: {
			type: String,
			required: false,
		},
		infoStyle: {
			type: Object,
			default: () => ({
				backgroundColor: '#f100a1',
				color: 'white',
			}),
		},
		title: {
			type: String,
			required: false,
		},
		label: {
			type: String,
			required: false,
		},
	},

	computed: {
		linkTitle() {
			return this.title || this.icon.charAt(0).toUpperCase() + this.icon.slice(1);
		},
		linkLabel() {
			return this.label || this.linkTitle;
		},
		isAction() {
			return this.to === '#';
		},
	},

	emits: ['click'],

	methods: {
		onClick(event) {
			if (this.isAction) {
				event.preventDefault();
			}
			this.$emit('click', event);
		},
	},
};
</script>

<style scoped>
/*
 * Same layout collapsed and expanded: a fixed icon column (the collapsed width) and the
 * label next to it, clipped by the sidebar. Expanding only changes the sidebar's width
 * and fades the label in, so nothing jumps or rewraps mid-animation.
 */
.side-panel-tab {
	cursor: pointer;
	position: relative;
}

.side-panel-tab:hover {
	background-color: var(--wanikani);
}

.side-panel-tab a {
	opacity: unset !important;
	height: 100%;
	display: flex;
	align-items: center;
	width: 100%;
}

/* icon column: always as wide as the collapsed sidebar, icon centered */
.side-panel-tab>a>div {
	position: relative;
	flex-shrink: 0;
	width: var(--sidebar-width);
	display: flex;
	justify-content: center;
}

.side-panel-tab>a img {
	filter: invert(1);
}

.side-panel-tab>a p {
	color: white;
	white-space: nowrap;
	opacity: 0;
	transition: opacity 0.12s ease;
}

.side-panel-focus .side-panel-tab>a p {
	opacity: 1;
	/* once there's room for it */
	transition: opacity 0.18s ease 0.08s;
}

/* badge on the icon ("A" on Random, list counts): same spot in both states */
.side-panel-info-alert {
	padding: 3px;
	position: absolute;
	top: -9px;
	right: 2px;
	font-size: 10px;
	font-weight: bold;
	border-radius: 4px;
	line-height: 1;
}
</style>