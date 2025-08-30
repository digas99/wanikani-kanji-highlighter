import { defineStore } from 'pinia';
import { getWKManager } from '@/lib/apiClient';
import { storage } from '#imports';
import { levelUpInfo, formatSubjectsData } from '@/utils/scripts/wanikani';

export const useWKStore = defineStore('wk', {
  state: () => ({
	loading: true,
	isLoggedIn: false,
	subjectsListScroll: 0,
	allSubjects: [] as Array<any>,
	userAvatar: '',
	userInfo: {} as any,
	levelProgressionInfo: {} as any
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

			// save a smaller curated version of all subjects data, just for app browsing
			// all subjects, no callback or event trigger (null, null)
			wkManager.getSubjects(null, null).then(this.handleBulkSubjectFetch);
		}
		this.loading = false;
    },
	handleBulkSubjectFetch(data: Array<any>) {
		this.allSubjects = formatSubjectsData(data);
		if (this.userInfo.level)
			this.levelProgressionInfo = levelUpInfo(data.filter(subject => subject.level == this.userInfo.level));
	},
	reset() {
	  this.loading = true;
	  this.isLoggedIn = false;
	  this.allSubjects = [];
	  storage.removeItem('sync:apiKey');
	  storage.removeItem('sync:proxyServer');
	}
  },
});
