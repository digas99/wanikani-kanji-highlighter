import { storage } from '#imports';
import { addNotifications } from './notifications';
import { readDriveBackupState } from './driveBackup';

/**
 * New features, said once in the bell's notifications (marked New): the first time the popup
 * opens after an update, and again after logging in (logging out forgets what was said).
 */

const STORAGE_KEY = 'local:featureNotices';

export type FeatureNoticeId = 'page-reading-level' | 'drive-backup' | 'trouble-subjects';

async function shown(): Promise<Record<string, number>> {
	return (await storage.getItem<Record<string, number>>(STORAGE_KEY)) ?? {};
}

export async function wasNoticeShown(id: FeatureNoticeId): Promise<boolean> {
	return Boolean((await shown())[id]);
}

export async function markNoticeShown(id: FeatureNoticeId): Promise<void> {
	await storage.setItem(STORAGE_KEY, { ...(await shown()), [id]: Date.now() });
}

export async function clearFeatureNotices(): Promise<void> {
	await storage.removeItem(STORAGE_KEY);
}

type FeatureNotice = {
	id: FeatureNoticeId;
	/** already in use: nothing to tell (marked as said) */
	inUse?: () => Promise<boolean>;
	notification: { title: string; text: string; route: { name: string; query?: Record<string, string> } };
};

const NOTICES: FeatureNotice[] = [
	{
		id: 'page-reading-level',
		notification: {
			title: 'New: page reading level',
			text: 'How much of a page\'s kanji you know, and a history of what you read. Turn it on in Settings → Reading.',
			route: { name: 'Settings', query: { tab: 'reading', section: 'reading-bar' } },
		},
	},
	{
		id: 'drive-backup',
		inUse: async () => (await readDriveBackupState()).connected,
		notification: {
			title: 'New: back up to Google Drive',
			text: 'Keep your settings, friends, pages read and past days\' activity in your own Google Drive, and bring them to another browser. Settings → Data → Backup.',
			route: { name: 'Settings', query: { tab: 'data', section: 'backup' } },
		},
	},
	{
		id: 'trouble-subjects',
		notification: {
			title: 'New: trouble subjects',
			text: 'The subjects you keep getting wrong now have a small ! on their tiles, and a list to see and practice them.',
			route: { name: 'Trouble' },
		},
	},
];

let running: Promise<void> | null = null;

/** Each new feature's notification, once (logged in, the popup ready). */
export function announceNewFeatures(): Promise<void> {
	running ??= (async () => {
		const said = await shown();
		const fresh: FeatureNotice['notification'][] = [];
		for (const notice of NOTICES) {
			if (said[notice.id]) continue;
			await markNoticeShown(notice.id);
			if (await notice.inUse?.()) continue;
			fresh.push(notice.notification);
		}
		if (fresh.length) await addNotifications(fresh.map(notification => ({ kind: 'feature', ...notification })));
	})().finally(() => { running = null; });
	return running;
}
