import { storage } from '#imports';

/**
 * The history behind the popup's toasts (friends' level-ups and hibernation, the daily
 * summary…): written when something happens (often by the background, while the popup is
 * closed), read by the sidebar's bell and the Notifications page.
 */

const STORAGE_KEY = 'local:notifications';
const MAX_NOTIFICATIONS = 100;

export type NotificationKind =
	| 'level_up'
	| 'accolade'
	| 'friend_level_up'
	| 'friend_hibernating'
	| 'friend_back'
	| 'daily_summary'
	| 'feature';

export type AppNotification = {
	id: string;
	kind: NotificationKind;
	title: string;
	text?: string;
	at: number;
	/** where clicking it goes (a route of the popup) */
	route?: { name: string; query?: Record<string, string> };
	/** friends: their avatar is looked up from the friends list when shown */
	username?: string;
	/** an accolade's badge (the extension's own image) */
	image?: string;
	read: boolean;
};

type NotificationsState = { version: 1; items: AppNotification[] };

function emptyState(): NotificationsState {
	return { version: 1, items: [] };
}

export async function readNotifications(): Promise<AppNotification[]> {
	const saved = await storage.getItem<NotificationsState>(STORAGE_KEY);
	return saved?.version === 1 ? saved.items : [];
}

export function watchNotifications(callback: (items: AppNotification[]) => void): () => void {
	return storage.watch<NotificationsState>(STORAGE_KEY, state => callback(state?.version === 1 ? state.items : []));
}

/** Newest first; the oldest go beyond the limit. */
export async function addNotifications(entries: Array<Omit<AppNotification, 'id' | 'read' | 'at'> & { at?: number }>): Promise<void> {
	if (!entries.length) return;
	const items = await readNotifications();
	const added = entries.map(entry => ({
		...entry,
		at: entry.at ?? Date.now(),
		id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
		read: false,
	}));
	const next = [...added, ...items].sort((a, b) => b.at - a.at).slice(0, MAX_NOTIFICATIONS);
	await storage.setItem<NotificationsState>(STORAGE_KEY, { version: 1, items: next });
}

export async function markAllNotificationsRead(): Promise<void> {
	const items = await readNotifications();
	if (!items.some(item => !item.read)) return;
	await storage.setItem<NotificationsState>(STORAGE_KEY, { version: 1, items: items.map(item => ({ ...item, read: true })) });
}

export async function clearNotifications(): Promise<void> {
	await storage.removeItem(STORAGE_KEY);
}

/** "5 min ago", "3 h ago", "yesterday", "12 Oct". */
export function notificationTime(at: number, now = Date.now()): string {
	const minutes = Math.floor((now - at) / 60000);
	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} h ago`;
	const days = Math.floor(hours / 24);
	if (days === 1) return 'yesterday';
	if (days < 7) return `${days} days ago`;
	return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
