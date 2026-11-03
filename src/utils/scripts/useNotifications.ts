import { computed, ref } from 'vue';
import { readNotifications, watchNotifications, type AppNotification } from './notifications';
import { readFriends, watchFriends, type FriendsState } from './friends';

/** The notifications, kept up to date (the sidebar's bell, its popover, the page). */
const items = ref<AppNotification[]>([]);
/** friends' avatars by lowercase username, for their notifications */
const avatars = ref<Record<string, string>>({});
let watching = false;

function avatarsOf(state: FriendsState): Record<string, string> {
	const map: Record<string, string> = {};
	for (const friend of state.friends) {
		const avatar = friend.profile?.avatar;
		if (avatar) map[(friend.profile?.username || friend.username).toLowerCase()] = avatar;
	}
	return map;
}

export function useNotifications() {
	if (!watching) {
		watching = true;
		void readNotifications().then(list => { items.value = list; });
		watchNotifications(list => { items.value = list; });
		void readFriends().then(state => { avatars.value = avatarsOf(state); });
		watchFriends(state => { avatars.value = avatarsOf(state); });
	}
	const unreadCount = computed(() => items.value.filter(item => !item.read).length);
	return { items, avatars, unreadCount };
}
