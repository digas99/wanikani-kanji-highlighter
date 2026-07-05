<script lang="ts" setup>
import { computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storage } from "#imports";
import { getWKManager } from '@/lib/apiClient';
import { useWKStore } from '@/stores';
import { useSettingsStore } from '@/stores/settings';
import { CONTEXT_MENU_SEARCH_STORAGE_KEY } from '@/utils/scripts/contextMenuSearch';

import Login from '@/views/Login.vue';
import HighlightChoice from '@/views/HighlightChoice.vue';
import Sidebar from "@/components/Navbar/Sidebar.vue";
import Topbar from "@/components/Navbar/Topbar.vue";
import Loading from "@/views/Loading.vue";
import LoadingToast from "@/components/LoadingToast.vue";
import RateLimitNotice from "@/components/RateLimitNotice.vue";

const wk = useWKStore();
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
		if (ready) void consumeContextMenuSearch();
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
			<RouterView />
		</template>
	</template>
	<LoadingToast v-if="wk.isLoggedIn" />
	<RateLimitNotice v-if="wk.isLoggedIn" />
</template>
