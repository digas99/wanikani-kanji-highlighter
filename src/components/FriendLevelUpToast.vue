<template>
	<!--
		What changed for friends (noticed by the background checks): level-ups, going into or
		coming back from hibernation. Said once, when the popup opens.
	-->
	<Teleport to="#top-toasts" defer>
	<Transition name="friend-toast">
		<div v-if="events.length" class="friend-toast" :class="{ quiet: events[0].kind === 'hibernating' }" role="status">
			<button type="button" class="friend-toast-main" title="Open Friends" @click="openFriends">
				<img v-if="events[0].avatar" class="friend-toast-avatar" :src="events[0].avatar" alt="">
				<span class="friend-toast-lines">
					<span v-for="(event, index) in shown" :key="index" class="friend-toast-line">
						<b>{{ event.username }}</b>
						<template v-if="event.kind === 'level_up'"> reached level <b>{{ event.level }}</b>!</template>
						<template v-else-if="event.kind === 'hibernating'"> went into hibernation 💤</template>
						<template v-else> is back from hibernation!</template>
					</span>
					<span v-if="events.length > shown.length" class="friend-toast-more">
						and {{ events.length - shown.length }} more
					</span>
				</span>
			</button>
			<button type="button" class="friend-toast-close" aria-label="Dismiss" @click="dismiss">×</button>
		</div>
	</Transition>
	</Teleport>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { markEventsAnnounced, readFriends, unannouncedEvents, type FriendEvent } from '@/utils/scripts/friends';

const VISIBLE_MS = 8000;
const MAX_LINES = 3;

const router = useRouter();
const events = ref<FriendEvent[]>([]);
const shown = computed(() => events.value.slice(0, MAX_LINES));
let timer: ReturnType<typeof setTimeout> | null = null;

function dismiss() {
	events.value = [];
	if (timer) clearTimeout(timer);
}

function openFriends() {
	dismiss();
	void router.push({ name: 'Friends' });
}

onMounted(async () => {
	const found = unannouncedEvents(await readFriends());
	if (!found.length) return;
	events.value = found;
	// once: closing the popup quickly doesn't bring it back
	await markEventsAnnounced();
	timer = setTimeout(dismiss, VISIBLE_MS + (found.length > 1 ? 3000 : 0));
});

onBeforeUnmount(() => {
	if (timer) clearTimeout(timer);
});
</script>

<style scoped>
/* in the top toasts stack (App.vue): the bottom belongs to Home's highlighted notice */
.friend-toast {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 6px 6px 6px 8px;
	box-sizing: border-box;
	border-radius: 12px;
	border: 1px solid var(--surface-border-color);
	border-left: 4px solid #30a46c;
	background: var(--fill-color);
	box-shadow: 0 6px 20px var(--shadow-soft-color), 0 1px 4px rgba(0, 0, 0, 0.15);
}

/* someone went into hibernation: calmer than a level-up */
.friend-toast.quiet {
	border-left-color: #8a8fa3;
}

.friend-toast-main {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 2px;
	border: none;
	background: transparent;
	color: var(--heading-color, #2a2d48);
	font-family: inherit;
	font-size: 12.5px;
	text-align: left;
	cursor: pointer;
}

.friend-toast-avatar {
	flex-shrink: 0;
	width: 30px;
	height: 30px;
	border-radius: 8px;
	background: #fff;
}

.friend-toast-lines {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 1px;
	line-height: 1.35;
}

.friend-toast-more {
	font-size: 11px;
	color: var(--font-sec-color);
}

.friend-toast-close {
	flex-shrink: 0;
	width: 24px;
	height: 24px;
	padding: 0;
	border: none;
	border-radius: 6px;
	background: transparent;
	color: var(--font-sec-color);
	font-size: 18px;
	line-height: 1;
	cursor: pointer;
}

.friend-toast-close:hover {
	background: var(--surface-muted-color);
}

.friend-toast-enter-active,
.friend-toast-leave-active {
	transition: opacity 0.25s ease, transform 0.25s ease;
}

.friend-toast-enter-from,
.friend-toast-leave-to {
	opacity: 0;
	transform: translateY(-10px);
}
</style>
