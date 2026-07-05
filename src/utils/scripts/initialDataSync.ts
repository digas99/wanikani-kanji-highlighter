import { storage } from '#imports';
import { createWKManager, DEFAULT_PROXY } from '@/lib/apiClient';
import { persistHighlightDataFromCache } from '@/utils/scripts/highlightDataSync';
import { getAllCacheLevels } from '@/utils/scripts/subjectCache';

const SYNC_LOCK_KEY = 'local:initialSyncLock';
const SYNC_LOCK_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const BACKGROUND_SYNC_OPTIONS = { includeAssignments: false, includeReviews: false };

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

	try {
		const manager = createWKManager({ apiKey: apiKey.trim(), proxyServer: proxy });
		const syncStarted = await storage.getItem<boolean>('local:initialSyncStarted');

		if (!syncStarted) {
			await manager.getUserInfo(null);
			await manager.getSummary(null);
			await manager.getAssignments(null);
			await storage.setItem('local:initialSyncStarted', true);
		}

		const missing = await getMissingLevels(manager);
		const levels = missing.length ? missing : getAllCacheLevels();
		if (levels.length) {
			await manager.syncSubjectsByLevels(
				levels,
				() => {},
				BACKGROUND_SYNC_OPTIONS,
			);
		}

		const assignments = await manager.storage.getAssignments();
		await persistHighlightDataFromCache(manager, assignments ?? []);

		await storage.setItem('local:initialSyncComplete', true);
		await storage.removeItem('local:firstLoadDone');
		return true;
	} catch {
		return false;
	} finally {
		await releaseSyncLock();
	}
}
