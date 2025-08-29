<script lang="ts" setup>
import { storage } from "#imports";
import { getWKManager } from '@/lib/apiClient';
import { useWKStore } from '@/stores';
import { useMagicKeys } from '@vueuse/core'
import { useRouter, useRoute } from 'vue-router'

import Login from '@/views/Login.vue';
import Sidebar from "@/components/Navbar/Sidebar.vue";
import Topbar from "@/components/Navbar/Topbar.vue";

const wk = useWKStore();
wk.init();

function handleLogin(apiKey: string, proxyServer: string) {
	localStorage.setItem('loggedIn', 'true');
	storage.setItems([
		{ key: 'sync:apiKey', value: apiKey },
		{ key: 'sync:proxyServer', value: proxyServer }
	]);

	wk.isLoggedIn = true;
	getWKManager(apiKey, proxyServer);

	wk.init();
}

const { current } = useMagicKeys();
const router = useRouter();
const route = useRoute();

watch(current, (keys) => {
	if (route.name === 'Search') return;

	for (const key of keys) {
		if (key.length === 1 && key.match(/[a-z]/i)) {
			router.push({ name: 'Search', params: { query: key } });
			break;
		}
	}
})
</script>

<template>
	<div v-if="wk.loading">Loading...</div>
	<template v-else>
		<Login v-if="!wk.isLoggedIn" @login="handleLogin" />
		<template v-else>
			<Topbar />
			<Sidebar />
			<RouterView />
		</template>
	</template>
</template>