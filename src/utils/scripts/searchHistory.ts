import { storage } from '#imports';

const STORAGE_KEY = 'local:searchHistory';
const MAX_ENTRIES = 30;

export async function getSearchHistoryIds(): Promise<number[]> {
	const ids = await storage.getItem<number[]>(STORAGE_KEY);
	return Array.isArray(ids) ? ids : [];
}

/** Remember a subject the user opened from the search page. */
export async function recordSearchHistorySubject(subjectId: number): Promise<void> {
	const id = Number(subjectId);
	if (!Number.isFinite(id) || id <= 0) return;

	const existing = await getSearchHistoryIds();
	const next = [id, ...existing.filter(entry => entry !== id)].slice(0, MAX_ENTRIES);
	await storage.setItem(STORAGE_KEY, next);
}

export async function clearSearchHistory(): Promise<void> {
	await storage.removeItem(STORAGE_KEY);
}
