<script lang="ts" setup>
import { computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storage } from "#imports";
import { getWKManager } from '@/lib/apiClient';
import { useWKStore } from '@/stores';
import { saveProfileCard } from '@/utils/scripts/partnerExtension';
import { useSettingsStore } from '@/stores/settings';
import { CONTEXT_MENU_SEARCH_STORAGE_KEY } from '@/utils/scripts/contextMenuSearch';

import Login from '@/views/Login.vue';
import HighlightChoice from '@/views/HighlightChoice.vue';
import Sidebar from "@/components/Navbar/Sidebar.vue";
import Topbar from "@/components/Navbar/Topbar.vue";
import Loading from "@/views/Loading.vue";
import LoadingToast from "@/components/LoadingToast.vue";
import RateLimitNotice from "@/components/RateLimitNotice.vue";
import FriendLevelUpToast from "@/components/FriendLevelUpToast.vue";
import MilestoneToast from "@/components/MilestoneToast.vue";
import { announceNewFeatures } from '@/utils/scripts/featureNotices';
import { loadTroubleSubjects, useTroubleSubjects, watchReviewStatistics } from '@/utils/scripts/troubleSubjects';
import { watchDailyActivity } from '@/utils/scripts/dailyActivity';
import { useAccolades } from '@/utils/scripts/useAccolades';
import { noteAccolades, noteLevel } from '@/utils/scripts/milestones';

const wk = useWKStore();

// whose this is (name, level, avatar): for the HanziHero Companion's popup to show (partnerExtension.ts)
watch(
	() => [wk.userInfo?.username, wk.userInfo?.level, wk.userAvatar],
	([name, level, avatar]) => {
		if (!name) return;
		void saveProfileCard({ name, level: level ? `Level ${level}` : null, avatar: avatar || null });
	},
	{ immediate: true },
);
const settings = useSettingsStore();
const route = useRoute();
const router = useRouter();
const isHome = computed(() => route.name === 'Home');
const appReady = computed(
	() => wk.isLoggedIn && !wk.showLoadingScreen && !wk.awaitingHighlightChoice,
);

async function openSearchForText(text: string): Promise<void> {
	const query = text.trim();
	if (!query) return;
	await router.push({ name: 'Search', query: { q: query } });
}

async function consumeContextMenuSearch(): Promise<void> {
	const text = await storage.getItem<string>(CONTEXT_MENU_SEARCH_STORAGE_KEY);
	if (!text?.trim()) return;
	await storage.removeItem(CONTEXT_MENU_SEARCH_STORAGE_KEY);
	await openSearchForText(text);
}

let popoutWindow = false;
let removeSelectionListener: (() => void) | undefined;

onMounted(async () => {
	// the badge (reviews, lessons…: when that's its choice) from a fresh summary
	void browser.runtime.sendMessage({ type: 'wkh:badgeRefresh' }).catch(() => {});
	try {
		const win = await browser.windows.getCurrent();
		popoutWindow = win.type === 'popup';
	} catch {
		popoutWindow = false;
	}

	if (popoutWindow) {
		const onSelectionMessage = (message: any) => {
			if (message?.type !== 'wkh:selectedText' || !appReady.value) return;
			void openSearchForText(message.selectedText ?? '');
		};
		browser.runtime.onMessage.addListener(onSelectionMessage);
		removeSelectionListener = () => browser.runtime.onMessage.removeListener(onSelectionMessage);
	}
});

onUnmounted(() => {
	removeSelectionListener?.();
});

watch(
	appReady,
	(ready) => {
		if (!ready) return;
		void consumeContextMenuSearch();
		// new features: once each, in the bell's notifications (no popup)
		void announceNewFeatures();
	},
	{ immediate: true },
);

// trouble subjects (their marks on tiles, the list): worked out once ready, again when the
// assignments arrive (only Apprentice counts), after each activity sync, and whenever review
// statistics are saved (a new device fills them in bit by bit: details, levels, the full fetch)
const troubleMarksOn = computed(() => settings.settings.extension_popup_interface?.trouble_marks !== false);
function refreshTrouble() {
	if (!appReady.value) return;
	if (!troubleMarksOn.value) {
		useTroubleSubjects().byId = new Map();
		return;
	}
	void loadTroubleSubjects(getWKManager(), wk.assignments);
}
watch([appReady, troubleMarksOn, () => wk.assignments.length], refreshTrouble, { immediate: true });
const unwatchActivity = watchDailyActivity(refreshTrouble);
onUnmounted(unwatchActivity);
// the manager exists once logged in: listen from then on
let unwatchReviews: (() => void) | null = null;
watch(appReady, ready => {
	if (!ready || unwatchReviews) return;
	unwatchReviews = watchReviewStatistics(getWKManager(), refreshTrouble);
}, { immediate: true });
onUnmounted(() => unwatchReviews?.());

// your level-ups and new accolades (toast, notifications, Home's celebration)
watch(
	() => (appReady.value ? Number(wk.userInfo?.level) || 0 : 0),
	(level) => {
		if (level) void noteLevel(level);
	},
	{ immediate: true },
);

const accolades = useAccolades();
/** Unlocked accolades, once everything they're counted from is in (else some would look new later). */
const unlockedAccolades = computed(() => {
	if (!appReady.value || !accolades.complete.value) return null;
	return accolades.groups.value.flatMap(group => group.milestones
		.filter(milestone => milestone.unlocked)
		.map(milestone => ({ id: milestone.id, type: group.type, title: `${group.title}: ${milestone.title}`, image: milestone.image })));
});

watch(
	() => unlockedAccolades.value?.map(accolade => accolade.id).join(','),
	() => {
		if (unlockedAccolades.value) void noteAccolades(unlockedAccolades.value, accolades.groups.value.map(group => group.type));
	},
	{ immediate: true },
);

function resetPageScroll() {
	window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

watch(
	() => wk.showLoadingScreen,
	(show, wasShowing) => {
		if (wasShowing && !show) {
			nextTick(() => requestAnimationFrame(resetPageScroll));
		}
	},
);

async function handleLogin(apiKey: string, proxyServer: string) {
	const normalizedKey = apiKey.trim();
	await storage.setItems([
		{ key: 'sync:apiKey', value: normalizedKey },
		{ key: 'sync:proxyServer', value: proxyServer }
	]);

	getWKManager(normalizedKey, proxyServer);

	if (!settings.loaded) await settings.init();
	await wk.init();
	void wk.continueStartupIfNeeded();
}
</script>

<template>
	<template v-if="!wk.bootstrapping">
		<Login v-if="!wk.isLoggedIn" @login="handleLogin" />
		<HighlightChoice v-else-if="wk.awaitingHighlightChoice" />
		<Loading v-else-if="wk.showLoadingScreen" />
		<template v-else>
			<Topbar v-if="!isHome" />
			<Sidebar />
			<!-- toasts at the top (friends' level-ups, Home's yesterday recap): stacked here -->
			<div id="top-toasts" class="top-toasts"></div>
			<!-- Home is kept while you're on other pages: coming back shows it at once (rebuilding
			     it each time took over a second); it follows the store's changes meanwhile -->
			<RouterView v-slot="{ Component }">
				<KeepAlive include="Home">
					<component :is="Component" />
				</KeepAlive>
			</RouterView>
			<MilestoneToast />
			<FriendLevelUpToast />
		</template>
	</template>
	<LoadingToast v-if="wk.isLoggedIn" />
	<!-- the loading screen says it itself (in place of its progress) -->
	<RateLimitNotice v-if="wk.isLoggedIn && !wk.showLoadingScreen" />
</template>
