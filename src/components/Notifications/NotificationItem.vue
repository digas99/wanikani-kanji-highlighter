<template>
	<!-- one notification: the sidebar's popover and the Notifications page -->
	<button
		type="button"
		class="notification-item"
		:class="[`kind-${item.kind}`, { unread, clickable: Boolean(item.route) }]"
		:title="item.route ? 'Open' : undefined"
		@click="open"
	>
		<img v-if="avatar" class="notification-avatar" :src="avatar" alt="">
		<img v-else-if="item.image" class="notification-image" :src="item.image" alt="">
		<span v-else class="notification-icon" aria-hidden="true">
			<!-- your level-up: a star -->
			<svg v-if="item.kind === 'level_up'" viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
			<!-- an accolade (without its image): a medal -->
			<svg v-else-if="item.kind === 'accolade'" viewBox="0 0 24 24"><circle cx="12" cy="9" r="5" /><path d="M8.5 13l-1.5 8 5-2.5 5 2.5-1.5-8" /></svg>
			<!-- a new feature: a sparkle -->
			<svg v-else-if="item.kind === 'feature'" viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></svg>
			<!-- level up -->
			<svg v-else-if="item.kind === 'friend_level_up'" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
			<!-- hibernating: a moon -->
			<svg v-else-if="item.kind === 'friend_hibernating'" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>
			<!-- back: a sun -->
			<svg v-else-if="item.kind === 'friend_back'" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
			<!-- daily summary: a calendar -->
			<svg v-else viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
		</span>
		<span class="notification-body">
			<span class="notification-title">{{ item.title }}</span>
			<span v-if="item.text" class="notification-text">{{ item.text }}</span>
			<span class="notification-time">{{ time }}</span>
		</span>
		<span v-if="unread" class="notification-dot" aria-label="Unread"></span>
	</button>
</template>

<script>
import { notificationTime } from '@/utils/scripts/notifications';

export default {
	name: 'NotificationItem',

	props: {
		item: {
			type: Object,
			required: true,
		},
		/** friends' avatars by lowercase username */
		avatars: {
			type: Object,
			default: () => ({}),
		},
		/** shown as unread (read state from before this view opened) */
		unread: Boolean,
	},

	emits: ['open'],

	computed: {
		avatar() {
			return this.item.username ? this.avatars[this.item.username.toLowerCase()] ?? null : null;
		},
		time() {
			return notificationTime(this.item.at);
		},
	},

	methods: {
		open() {
			if (!this.item.route) return;
			this.$emit('open');
			void this.$router.push(this.item.route);
		},
	},
};
</script>

<style scoped>
.notification-item {
	position: relative;
	display: flex;
	align-items: flex-start;
	gap: 10px;
	width: 100%;
	padding: 9px 10px;
	border: none;
	border-radius: 10px;
	background: transparent;
	color: var(--font-color);
	font-family: inherit;
	text-align: left;
	cursor: default;
}

.notification-item.clickable {
	cursor: pointer;
}

.notification-item.clickable:hover {
	background: var(--surface-muted-color);
}

.notification-avatar,
.notification-image,
.notification-icon {
	flex-shrink: 0;
	width: 30px;
	height: 30px;
	border-radius: 8px;
}

.notification-avatar {
	background: #fff;
	object-fit: cover;
}

.notification-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--surface-muted-color);
}

.notification-icon svg {
	width: 17px;
	height: 17px;
	fill: none;
	stroke: var(--icon-color, var(--font-sec-color));
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.notification-image {
	object-fit: contain;
}

.kind-level_up { --icon-color: var(--wanikani, #f100a1); }
.kind-feature { --icon-color: var(--pill-color, #e36f94); }
.kind-accolade { --icon-color: #c9a227; }
.kind-friend_level_up { --icon-color: #30a46c; }
.kind-friend_hibernating { --icon-color: #8a8fa3; }
.kind-friend_back { --icon-color: #f5a623; }
.kind-daily_summary { --icon-color: var(--pill-color, #e36f94); }

.notification-body {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 1px;
	line-height: 1.35;
}

.notification-title {
	font-size: 12.5px;
	font-weight: 700;
	color: var(--heading-color, #2a2d48);
}

.notification-text {
	font-size: 11.5px;
	color: var(--font-sec-color);
}

.notification-time {
	font-size: 10.5px;
	color: var(--font-sec-color);
	opacity: 0.8;
}

.notification-dot {
	flex-shrink: 0;
	align-self: center;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--pill-color, #e36f94);
}
</style>
