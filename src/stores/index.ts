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
		console.log({ apiKey, proxyServer });
		if (apiKey && proxyServer) {
			const wkManager = getWKManager(apiKey, proxyServer);
			console.log(wkManager, wkManager.apiKey);
			this.isLoggedIn = true;

			wkManager.getUserInfo();
			wkManager.updateSubjects(null);
		}
		this.loading = false;
    },
	reset() {
	  this.loading = true;
	  this.isLoggedIn = false;
	  storage.removeItem('sync:apiKey');
	  storage.removeItem('sync:proxyServer');
	}
  },
});
