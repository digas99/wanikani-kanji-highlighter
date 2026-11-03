import { storage } from '#imports';

const STORAGE_KEY = 'local:searchHistory';

export const SEARCH_HISTORY_SIZE_OPTIONS = [25, 50, 100, 150, 250] as const;
export const DEFAULT_SEARCH_HISTORY_SIZE = 100;

/** Configured "Recently viewed" limit (Settings → Search). */
async function getHistoryLimit(): Promise<number> {
	const settings = await storage.getItem<any>('local:settings');
	const size = Number(settings?.search?.history_size);
	return Number.isFinite(size) && size > 0 ? size : DEFAULT_SEARCH_HISTORY_SIZE;
}

export async function getSearchHistoryIds(): Promise<number[]> {
	const [ids, limit] = await Promise.all([
		storage.getItem<number[]>(STORAGE_KEY),
		getHistoryLimit(),
	]);
	return Array.isArray(ids) ? ids.slice(0, limit) : [];
}

/** Remember a subject the user opened from the search page. */
export async function recordSearchHistorySubject(subjectId: number): Promise<void> {
	const id = Number(subjectId);
	if (!Number.isFinite(id) || id <= 0) return;

	const [existing, limit] = await Promise.all([getSearchHistoryIds(), getHistoryLimit()]);
	const next = [id, ...existing.filter(entry => entry !== id)].slice(0, limit);
	await storage.setItem(STORAGE_KEY, next);
}

/** Drop entries beyond `limit` (used when the setting is lowered). */
export async function trimSearchHistory(limit: number): Promise<void> {
	const ids = await storage.getItem<number[]>(STORAGE_KEY);
	if (!Array.isArray(ids) || ids.length <= limit) return;
	await storage.setItem(STORAGE_KEY, ids.slice(0, limit));
}

export async function clearSearchHistory(): Promise<void> {
	await storage.removeItem(STORAGE_KEY);
}
