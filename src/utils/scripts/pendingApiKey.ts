import { storage } from '#imports';

/**
 * An API key sent from WaniKani's tokens page ("Send to WK Highlighter", see
 * utils/highlight/apiKeyHandoff.ts), waiting for the Login screen to use it.
 */

const STORAGE_KEY = 'local:pendingApiKey';
/** an old hand-off isn't offered any more */
const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const API_KEY_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** the only page allowed to hand over a key */
export const TOKENS_PAGE_URL = 'https://www.wanikani.com/settings/personal_access_tokens';

type PendingApiKey = { key: string; at: number; tabId?: number };

export async function setPendingApiKey(key: string, tabId?: number): Promise<void> {
	await storage.setItem<PendingApiKey>(STORAGE_KEY, { key, at: Date.now(), tabId });
}

export async function readPendingApiKey(): Promise<string | null> {
	const pending = await storage.getItem<PendingApiKey>(STORAGE_KEY);
	if (!pending || Date.now() - pending.at > PENDING_MAX_AGE_MS) return null;
	return API_KEY_FORMAT.test(pending.key) ? pending.key : null;
}

/** Used (logged in) or stale: forget it; returns the tab it came from (its badge to clear). */
export async function clearPendingApiKey(): Promise<number | undefined> {
	const pending = await storage.getItem<PendingApiKey>(STORAGE_KEY);
	await storage.removeItem(STORAGE_KEY);
	return pending?.tabId;
}
