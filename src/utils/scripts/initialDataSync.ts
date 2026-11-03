import { storage } from '#imports';
import { createWKManager, DEFAULT_PROXY } from '@/lib/apiClient';
import { persistHighlightDataFromCache } from '@/utils/scripts/highlightDataSync';
import { getAllCacheLevels } from '@/utils/scripts/subjectCache';

const SYNC_LOCK_KEY = 'local:initialSyncLock';
/** how far the background's sync is (a popup opened meanwhile shows it): { loaded, total } */
export const SYNC_PROGRESS_KEY = 'local:initialSyncProgress';
/**
 * A running sync renews its lock every SYNC_LOCK_RENEW_MS; one not renewed for this long was cut
 * off (the browser closed mid-sync): it doesn't hold the next one back.
 */
const SYNC_LOCK_MAX_AGE_MS = 90 * 1000;
const SYNC_LOCK_RENEW_MS = 20 * 1000;
const BACKGROUND_SYNC_OPTIONS = { includeAssignments: false, includeReviews: false };
/** While the remaining levels sync, refresh page highlights every N levels. */
const PUBLISH_EVERY_LEVELS = 15;

async function getMissingLevels(manager: ReturnType<typeof createWKManager>): Promise<number[]> {
	const missing: number[] = [];
	for (const level of getAllCacheLevels()) {
		const ids = await manager.storage.getIdsByLevel([level]);
		if (!ids.length) missing.push(level);
	}
	return missing;
}

async function acquireSyncLock(): Promise<boolean> {
	const existing = await storage.getItem<number>(SYNC_LOCK_KEY);
	if (existing && Date.now() - existing < SYNC_LOCK_MAX_AGE_MS) return false;
	await storage.setItem(SYNC_LOCK_KEY, Date.now());
	return true;
}

async function releaseSyncLock(): Promise<void> {
	await storage.removeItem(SYNC_LOCK_KEY);
}

export async function isInitialSyncLocked(): Promise<boolean> {
	const existing = await storage.getItem<number>(SYNC_LOCK_KEY);
	return Boolean(existing && Date.now() - existing < SYNC_LOCK_MAX_AGE_MS);
}

/**
 * First-time (or resumed) subject cache sync. Safe to call from the background
 * service worker or the popup store — uses a storage lock to avoid duplicate runs.
 */
export async function runInitialDataSyncIfNeeded(): Promise<boolean> {
	const [syncComplete, apiKey, proxyServer] = await Promise.all([
		storage.getItem<boolean>('local:initialSyncComplete'),
		storage.getItem<string>('sync:apiKey'),
		storage.getItem<string>('sync:proxyServer'),
	]);

	if (syncComplete || !apiKey?.trim()) return false;

	const proxy = proxyServer?.trim() || DEFAULT_PROXY;
	if (!proxyServer?.trim()) {
		await storage.setItem('sync:proxyServer', proxy);
	}

	if (!(await acquireSyncLock())) return false;
	// still running: the lock stays fresh (a stale one means the sync was cut off)
	const renew = setInterval(() => void storage.setItem(SYNC_LOCK_KEY, Date.now()), SYNC_LOCK_RENEW_MS);

	try {
		const manager = createWKManager({ apiKey: apiKey.trim(), proxyServer: proxy });
		const syncStarted = await storage.getItem<boolean>('local:initialSyncStarted');

		if (!syncStarted) {
			await manager.getUserInfo(null);
			await manager.getSummary(null);
			await manager.getAssignments(null);
			await storage.setItem('local:initialSyncStarted', true);
		}

		// subjects kept from before (logged out, or another account): only what's missing
		const levels = await getMissingLevels(manager);
		const assignments = (await manager.storage.getAssignments()) ?? [];

		// Highlight data is what makes pages light up: don't wait for all 60 levels.
		// Sync the user's levels first (what they've learned), publish highlights,
		// then keep refreshing them while the remaining levels download.
		// cached in memory when this run fetched it above; a resumed sync fetches it once
		const userInfo = (await manager.getUserInfo(() => {})) ?? (await manager.getUserInfo(null));
		const userLevel = Number(userInfo?.level) || null;
		const firstLevels = userLevel ? levels.filter(level => level <= userLevel) : [];
		const laterLevels = levels.filter(level => !firstLevels.includes(level));

		// a popup opened meanwhile follows along (its toast's "x / y")
		let loaded = 0;
		const levelDone = () => {
			loaded += 1;
			void storage.setItem(SYNC_PROGRESS_KEY, { loaded, total: levels.length });
		};
		await storage.setItem(SYNC_PROGRESS_KEY, { loaded: 0, total: levels.length });

		if (firstLevels.length) {
			await manager.syncSubjectsByLevels(firstLevels, levelDone, BACKGROUND_SYNC_OPTIONS);
			await persistHighlightDataFromCache(manager, assignments);
		}

		if (laterLevels.length) {
			let publishing: Promise<void> | null = null;
			await manager.syncSubjectsByLevels(
				laterLevels,
				(_level: number, index: number) => {
					levelDone();
					if (index % PUBLISH_EVERY_LEVELS !== 0 || publishing) return;
					publishing = persistHighlightDataFromCache(manager, assignments)
						.catch(() => {})
						.finally(() => { publishing = null; });
				},
				BACKGROUND_SYNC_OPTIONS,
			);
			if (publishing) await publishing;
		}

		await persistHighlightDataFromCache(manager, assignments);

		await storage.setItem('local:initialSyncComplete', true);
		await storage.removeItem('local:firstLoadDone');
		return true;
	} catch {
		return false;
	} finally {
		clearInterval(renew);
		await storage.removeItem(SYNC_PROGRESS_KEY);
		await releaseSyncLock();
	}
}
