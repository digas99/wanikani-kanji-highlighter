import { defineStore } from 'pinia';
import { getWKManager } from '@/lib/apiClient';
import { storage } from '#imports';

export const useWKStore = defineStore('wk', {
  state: () => ({
	loading: true,
	isLoggedIn: false,
	subjectsListScroll: 0,
	allSubjects: [] as Array<any>,
	userAvatar: '',
	userInfo: {}
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
			wkManager.getSubjects(null, null).then((data: Array<any>) => this.allSubjects = this.formatSubjectsData(data));
		}
		this.loading = false;
    },
	formatSubjectsData(data: Array<any>) {
		return data.map(item => ({
			id: item.id,
			type: item.type,
			characters: item.characters,
			character_images: item.character_images,
			assignment: {
				id: item.assignment?.id,
				srs_stage: item.assignment?.srs_stage,
				subject_type: item.assignment?.subject_type
			}
		}));
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
