import WanikaniAPIManager from 'wanikani-api-manager'

export const DEFAULT_PROXY = 'https://proxy.wkhighlighter.com'
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
