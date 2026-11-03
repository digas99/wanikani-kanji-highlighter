<template>
	<div class="container notifications-page">
		<section class="notifications-card">
			<header class="notifications-head">
				<span class="notifications-title">Notifications</span>
				<button v-if="items.length" type="button" class="notifications-clear" @click="clear">Clear all</button>
			</header>
			<div v-if="items.length" class="notifications-list">
				<NotificationItem
					v-for="item in items"
					:key="item.id"
					:item="item"
					:avatars="avatars"
					:unread="unreadAtOpen.has(item.id)"
				/>
			</div>
			<p v-else class="notifications-empty">
				Nothing yet. Friends' level-ups and hibernation, and your daily summaries, will show up here
				(the last {{ max }}).
			</p>
		</section>
	</div>
</template>

<script>
import NotificationItem from '@/components/Notifications/NotificationItem.vue';
import { clearNotifications, markAllNotificationsRead, readNotifications } from '@/utils/scripts/notifications';
import { useNotifications } from '@/utils/scripts/useNotifications';

export default {
	name: 'Notifications',

	components: {
		NotificationItem,
	},

	data() {
		const { items, avatars } = useNotifications();
		return {
			items,
			avatars,
			unreadAtOpen: new Set(),
			max: 100,
		};
	},

	async created() {
		// the dots stay for this visit; the bell's count goes away
		const list = await readNotifications();
		this.unreadAtOpen = new Set(list.filter(item => !item.read).map(item => item.id));
		void markAllNotificationsRead();
	},

	methods: {
		async clear() {
			await clearNotifications();
		},
	},
};
</script>

<style scoped>
.notifications-page {
	padding-top: 12px;
	padding-bottom: 20px;
}

.notifications-card {
	padding: 10px;
	border-radius: var(--card-radius, 12px);
	border: 1px solid var(--surface-border-color);
	background: var(--fill-color);
	box-shadow: 0 2px 10px var(--shadow-soft-color);
}

.notifications-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 2px 2px 8px;
}

.notifications-title {
	padding: 3px 10px;
	border-radius: 999px;
	background: var(--pill-color, #e36f94);
	color: #fff;
	font-weight: 700;
	font-size: 11.5px;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.notifications-clear {
	padding: 4px 10px;
	border: 1px solid var(--surface-border-color);
	border-radius: 999px;
	background: transparent;
	color: var(--font-sec-color);
	font-family: inherit;
	font-size: 11.5px;
	font-weight: 700;
	cursor: pointer;
}

.notifications-list {
	display: flex;
	flex-direction: column;
}

.notifications-empty {
	margin: 6px 4px;
	font-size: 12px;
	color: var(--font-sec-color);
}
</style>
