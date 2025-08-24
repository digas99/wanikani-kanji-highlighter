<script lang="ts" setup>
import { storage } from "#imports";
import { getWKManager } from '@/lib/apiClient';
import { useWKStore } from '@/stores';

import Login from '@/components/Login.vue';
import Main from '@/components/Main.vue';

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
}
</script>

<template>
	<div v-if="wk.loading">Loading...</div>
	<template v-else>
		<Login v-if="!wk.isLoggedIn" @login="handleLogin" />
		<Main v-else />
	</template>
</template>