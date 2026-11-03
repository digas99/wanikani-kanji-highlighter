<template>
	<!-- the sidebar bell's popover: the latest notifications, and a way to all of them -->
	<Transition name="notifications-popover">
		<div v-if="open" ref="panel" class="notifications-popover" :style="{ top: `${top}px` }" role="dialog" aria-label="Notifications">
			<header class="notifications-popover-head">
				<b>Notifications</b>
			</header>
			<div v-if="latest.length" class="notifications-popover-list">
				<NotificationItem
					v-for="item in latest"
					:key="item.id"
					:item="item"
					:avatars="avatars"
					:unread="unreadAtOpen.has(item.id)"
					@open="$emit('close')"
				/>
			</div>
			<p v-else class="notifications-popover-empty">
				Nothing yet. Your level-ups and accolades, friends' news and your daily summaries will show up here.
			</p>
			<RouterLink :to="{ name: 'Notifications' }" class="notifications-popover-all" @click="$emit('close')">
				Show all ›
			</RouterLink>
		</div>
	</Transition>
</template>

<script>
import NotificationItem from '@/components/Notifications/NotificationItem.vue';
import { markAllNotificationsRead } from '@/utils/scripts/notifications';
import { useNotifications } from '@/utils/scripts/useNotifications';

const SHOWN = 5;

export default {
	name: 'NotificationsPopover',

	components: {
		NotificationItem,
	},

	props: {
		open: Boolean,
		/** vertical position (next to the bell) */
		top: {
			type: Number,
			default: 60,
		},
	},

	emits: ['close'],

	data() {
		const { items, avatars } = useNotifications();
		return {
			items,
			avatars,
			/** unread when the popover opened: their dots stay while it's open */
			unreadAtOpen: new Set(),
		};
	},

	computed: {
		latest() {
			return this.items.slice(0, SHOWN);
		},
	},

	watch: {
		open(isOpen) {
			if (isOpen) {
				this.unreadAtOpen = new Set(this.items.filter(item => !item.read).map(item => item.id));
				// opening it is reading them
				void markAllNotificationsRead();
				setTimeout(() => document.addEventListener('pointerdown', this.onOutside, true));
				document.addEventListener('keydown', this.onKey);
			} else {
				this.stopListening();
			}
		},
		// another page (not the bell's own "#" link, which counts as a route change)
		'$route.name'() {
			if (this.open) this.$emit('close');
		},
	},

	beforeUnmount() {
		this.stopListening();
	},

	methods: {
		onOutside(event) {
			const panel = this.$refs.panel;
			// the bell itself toggles it
			if (panel?.contains(event.target) || event.target.closest?.('[data-label="notifications"]')) return;
			this.$emit('close');
		},
		onKey(event) {
			if (event.key === 'Escape') this.$emit('close');
		},
		stopListening() {
			document.removeEventListener('pointerdown', this.onOutside, true);
			document.removeEventListener('keydown', this.onKey);
		},
	},
};
</script>

<style scoped>
.notifications-popover {
	position: fixed;
	right: calc(var(--sidebar-width) + 8px + var(--frame-right, 0px));
	width: min(320px, calc(100vw - var(--sidebar-width) - 24px));
	z-index: 1000;
	display: flex;
	flex-direction: column;
	padding: 8px;
	box-sizing: border-box;
	border-radius: 12px;
	border: 1px solid var(--surface-border-color);
	background: var(--fill-color);
	box-shadow: 0 10px 30px var(--shadow-soft-color), 0 2px 6px rgba(0, 0, 0, 0.15);
}

.notifications-popover-head {
	padding: 4px 6px 6px;
	font-size: 13px;
	color: var(--heading-color, #2a2d48);
}

.notifications-popover-list {
	display: flex;
	flex-direction: column;
}

.notifications-popover-empty {
	margin: 4px 6px 10px;
	font-size: 12px;
	color: var(--font-sec-color);
}

.notifications-popover-all {
	align-self: stretch;
	margin-top: 4px;
	padding: 7px;
	border-radius: 8px;
	text-align: center;
	font-size: 12px;
	font-weight: 700;
	color: var(--pill-color, #e36f94);
	text-decoration: none;
}

.notifications-popover-all:hover {
	opacity: 1;
	background: var(--surface-muted-color);
}

.notifications-popover-enter-active,
.notifications-popover-leave-active {
	transition: opacity 0.15s ease, transform 0.15s ease;
}

.notifications-popover-enter-from,
.notifications-popover-leave-to {
	opacity: 0;
	transform: translateX(8px);
}
</style>
