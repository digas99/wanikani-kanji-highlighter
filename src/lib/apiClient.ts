import WanikaniAPIManager from 'wanikani-api-manager'
import { DEFAULT_PROXY } from './proxy'
import { fetchWaniKaniPage, isBackgroundContext } from '@/utils/scripts/wanikaniPages'

export { DEFAULT_PROXY }
export const ID_BATCH_SIZE = 100

/** Minimum time between dashboard network refreshes (matches v1.5-style polling). */
export const DASHBOARD_REFRESH_MS = 5 * 60 * 1000

let client: WanikaniAPIManager | null = null

export type WKManagerConfig = {
	apiKey: string
	proxyServer?: string
	idBatchSize?: number
	debug?: boolean
}

export function createWKManager({
	apiKey,
	proxyServer = DEFAULT_PROXY,
	idBatchSize = ID_BATCH_SIZE,
	debug = import.meta.env.VITE_WK_DEBUG === 'true',
}: WKManagerConfig) {
	return new WanikaniAPIManager({
		apiKey,
		proxy: proxyServer,
		idBatchSize,
		debug,
		// the profile page (avatar) is read by the background script (see wanikaniPages.ts)
		fetchPage: isBackgroundContext() ? undefined : fetchWaniKaniPage,
		// The extension never listens to per-row Dexie events; skipping them keeps
		// reads and bulk writes fast.
		hooks: { reading: false, updating: false, deleting: false },
		cacheIntervals: {
			user: 60 * 60 * 1000,
			materials: 24 * 60 * 60 * 1000,
			assignments: DASHBOARD_REFRESH_MS,
			reviews: 30 * 60 * 1000,
			summary: DASHBOARD_REFRESH_MS,
			levelProgressions: 60 * 60 * 1000,
		},
	})
}

export function getWKManager(apiKey?: string, proxyServer?: string) {
	if (!client && apiKey && proxyServer) {
		client = createWKManager({ apiKey, proxyServer })
	}
	return client
}

export function resetWKManager() {
	client = null
}
