import { ref, type Ref } from 'vue';
import { readFriends, watchFriends } from './friends';

/** How many friends, kept up to date (the Friends buttons on Home and the Profile show it). */
const count = ref(0);
/** the count was read (0 before that doesn't mean no friends) */
const loaded = ref(false);
let watching = false;

function startWatching() {
	if (watching) return;
	watching = true;
	void readFriends().then(state => {
		count.value = state.friends.length;
		loaded.value = true;
	});
	watchFriends(state => { count.value = state.friends.length; });
}

export function useFriendCount(): Ref<number> {
	startWatching();
	return count;
}

export function useFriendCountLoaded(): Ref<boolean> {
	startWatching();
	return loaded;
}
