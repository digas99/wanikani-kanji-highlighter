import { defineStore } from 'pinia';
import { getWKManager } from '@/lib/apiClient';
import { storage } from '#imports';

export const useWKStore = defineStore('wk', {
  state: () => ({
    loading: true,
    isLoggedIn: false,
  }),
  actions: {
    async init() {
    	const res = await storage.getItems(['sync:apiKey', 'sync:proxyServer']);
		const apiKey = res.find(item => item.key === 'sync:apiKey')?.value;
		const proxyServer = res.find(item => item.key === 'sync:proxyServer')?.value;
		if (apiKey && proxyServer) {
			getWKManager(apiKey, proxyServer);
			this.isLoggedIn = true;
		}
		this.loading = false;
    },
  },
});
