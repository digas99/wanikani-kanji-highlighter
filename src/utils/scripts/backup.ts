import { storage } from '#imports';
import { readFriends, importFriends } from './friends';
import {
	importPageHistory,
	importPageSentences,
	importSentenceArchive,
	pageHistorySize,
	readPageHistory,
	readSentenceArchive,
} from './pageHistory';
import { describeActivityBackup, importActivityBackup, readActivityBackup } from './dailyActivity';
import { FOCUS_SITES_KEY, HIDDEN_SITES_KEY, SECTIONS_KEY } from './pageStats';
import { DEFAULT_SEARCH_HISTORY_SIZE } from './searchHistory';
import { KNOWN_SUBJECTS_KEY } from './knownSubjects';
import { verifyApiKeyWithRequest } from './apiKeyValidation';

/**
 * Settings → Data → Backup: a file with what only this browser knows (WaniKani's API
 * can't give it back): settings, friends, pages read, past days' activity… Importing merges:
 * what's already here stays, except the settings (replaced).
 *
 * The API key is only ever in Google Drive backups, and only if switched on: it's what lets the
 * login screen restore everything from Drive. It's never in a file, and never imported here.
 */

const FILE_APP = 'wanikani-kanji-highlighter';
const FILE_VERSION = 1;

export type BackupPartId = 'settings' | 'siteChoices' | 'friends' | 'pageHistory' | 'pageSentences' | 'activity' | 'searchHistory' | 'knownSubjects' | 'apiKey';

export type BackupTarget = 'file' | 'drive';

/** The API key part: the key, and whose it is (for the login screen's list). */
export type BackupApiKey = { key: string; username: string | null };

type BackupPart = {
	id: BackupPartId;
	label: string;
	description: string;
	/** only in Google Drive backups (never in a file) */
	driveOnly?: boolean;
	/** off until switched on */
	offByDefault?: boolean;
	/** not offered by the import step (the API key: only used to log in) */
	notImported?: boolean;
	/** null: nothing to save */
	read(): Promise<unknown | null>;
	/** "12 pages" */
	describe(data: any): string;
	/** merges `data` in; what was added / changed, for the result message */
	write(data: any): Promise<string>;
};

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const isObject = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter(item => typeof item === 'string') : []);
const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];

export const BACKUP_PARTS: BackupPart[] = [
	{
		id: 'settings',
		label: 'Settings',
		description: 'Every setting, and the sites the extension is kept off (or only on)',
		async read() {
			const [settings, blacklist, whitelist] = await Promise.all([
				storage.getItem<Record<string, unknown>>('local:settings'),
				storage.getItem<string[]>('local:blacklist'),
				storage.getItem<string[]>('local:whitelist'),
			]);
			if (!settings && !blacklist?.length && !whitelist?.length) return null;
			return { settings: settings ?? null, blacklist: blacklist ?? [], whitelist: whitelist ?? [] };
		},
		describe(data) {
			const sites = strings(data?.blacklist).length + strings(data?.whitelist).length;
			return sites ? `settings, ${plural(sites, 'site')}` : 'settings';
		},
		async write(data) {
			if (!isObject(data)) return '';
			// replaced (missing ones get their defaults when the settings load)
			if (isObject(data.settings)) await storage.setItem('local:settings', data.settings);
			const [blacklist, whitelist] = await Promise.all([
				storage.getItem<string[]>('local:blacklist'),
				storage.getItem<string[]>('local:whitelist'),
			]);
			await storage.setItems([
				{ key: 'local:blacklist', value: union(strings(blacklist), strings(data.blacklist)) },
				{ key: 'local:whitelist', value: union(strings(whitelist), strings(data.whitelist)) },
			]);
			return 'settings replaced';
		},
	},
	{
		id: 'siteChoices',
		label: 'Reading level site choices',
		description: 'The parts chosen to rate on each site, sites where the bar is hidden, focus left on',
		async read() {
			const [hidden, sections, focus] = await Promise.all([
				storage.getItem<string[]>(HIDDEN_SITES_KEY),
				storage.getItem<Record<string, string[]>>(SECTIONS_KEY),
				storage.getItem<string[]>(FOCUS_SITES_KEY),
			]);
			if (!hidden?.length && !Object.keys(sections ?? {}).length && !focus?.length) return null;
			return { hidden: hidden ?? [], sections: sections ?? {}, focus: focus ?? [] };
		},
		describe(data) {
			const sites = new Set([...strings(data?.hidden), ...Object.keys(isObject(data?.sections) ? data.sections : {}), ...strings(data?.focus)]);
			return plural(sites.size, 'site');
		},
		async write(data) {
			if (!isObject(data)) return '';
			const [hidden, sections, focus] = await Promise.all([
				storage.getItem<string[]>(HIDDEN_SITES_KEY),
				storage.getItem<Record<string, string[]>>(SECTIONS_KEY),
				storage.getItem<string[]>(FOCUS_SITES_KEY),
			]);
			const mergedSections: Record<string, string[]> = { ...(sections ?? {}) };
			for (const [host, selectors] of Object.entries(isObject(data.sections) ? data.sections : {})) {
				mergedSections[host] = union(mergedSections[host] ?? [], strings(selectors));
			}
			await storage.setItems([
				{ key: HIDDEN_SITES_KEY, value: union(strings(hidden), strings(data.hidden)) },
				{ key: SECTIONS_KEY, value: mergedSections },
				{ key: FOCUS_SITES_KEY, value: union(strings(focus), strings(data.focus)) },
			]);
			return 'site choices merged';
		},
	},
	{
		id: 'friends',
		label: 'Friends',
		description: 'The WaniKani users you follow',
		async read() {
			const { friends } = await readFriends();
			return friends.length ? friends : null;
		},
		describe: data => plural(Array.isArray(data) ? data.length : 0, 'friend'),
		async write(data) {
			const added = await importFriends(Array.isArray(data) ? data : []);
			return `${plural(added, 'friend')} added`;
		},
	},
	{
		id: 'pageHistory',
		label: 'Pages read',
		description: 'The reading level history: the pages\' addresses, titles and ratings',
		async read() {
			const entries = await readPageHistory();
			// the sentences are a part of their own (off until switched on)
			return entries.length ? entries.map(({ sentences: _own, translations: _theirs, ...entry }) => entry) : null;
		},
		describe: data => plural(Array.isArray(data) ? data.length : 0, 'page'),
		async write(data) {
			const settings = await storage.getItem<any>('local:settings');
			const added = await importPageHistory(Array.isArray(data) ? data : [], pageHistorySize(settings));
			return `${plural(added, 'page')} added`;
		},
	},
	{
		id: 'pageSentences',
		label: 'Example sentences',
		description: 'The sentences kept from the pages you read: their actual text (and translations)',
		// their text can be anything you read (mail, chats…): only when chosen
		offByDefault: true,
		async read() {
			const pages = (await readPageHistory())
				.filter(entry => entry.sentences?.length)
				// with the translations asked for
				.map(entry => ({ url: entry.url, sentences: entry.sentences, ...(entry.translations ? { translations: entry.translations } : {}) }));
			// and those of pages that left the history (archived)
			const archive = await readSentenceArchive();
			return pages.length || archive.length ? { pages, archive } : null;
		},
		describe(data) {
			// older backups: the pages' list on its own
			const pages = Array.isArray(data) ? data : Array.isArray(data?.pages) ? data.pages : [];
			const archived = Array.isArray(data?.archive) ? data.archive.length : 0;
			const count = pages.reduce((sum: number, page: any) => sum + (Array.isArray(page?.sentences) ? page.sentences.length : 0), 0);
			return plural(count + archived, 'sentence');
		},
		async write(data) {
			// onto the pages already here (the Pages read part brings them), and the archived ones
			const pages = Array.isArray(data) ? data : Array.isArray(data?.pages) ? data.pages : [];
			const added = await importPageSentences(pages);
			const archived = Array.isArray(data?.archive) ? await importSentenceArchive(data.archive) : 0;
			return [`sentences for ${plural(added, 'page')}`, ...(archived ? [`${plural(archived, 'archived sentence')}`] : [])].join(', ');
		},
	},
	{
		id: 'activity',
		label: 'Daily activity',
		description: 'Past days\' reviews, accuracy and SRS moves (WaniKani no longer shares them), and today\'s so far',
		async read() {
			const backup = await readActivityBackup();
			return Object.keys(backup.history).length || backup.tracking ? backup : null;
		},
		describe(data) {
			const { days, today } = describeActivityBackup(data);
			if (!days) return today ? 'today' : plural(0, 'day');
			return today ? `${plural(days, 'day')} and today` : plural(days, 'day');
		},
		async write(data) {
			const { days, tracking } = await importActivityBackup(data);
			// today: tracked from the backup's start, every review scored after the next sync
			return [`${plural(days, 'day')} added`, ...(tracking ? ['today\'s tracking continued'] : [])].join(', ');
		},
	},
	{
		id: 'searchHistory',
		label: 'Recently viewed',
		description: 'The subjects opened from Search',
		async read() {
			const ids = await storage.getItem<number[]>('local:searchHistory');
			return ids?.length ? ids : null;
		},
		describe: data => plural(Array.isArray(data) ? data.length : 0, 'subject'),
		async write(data) {
			const imported = Array.isArray(data) ? data.filter(id => Number.isInteger(id) && id > 0) : [];
			const [current, settings] = await Promise.all([
				storage.getItem<number[]>('local:searchHistory'),
				storage.getItem<any>('local:settings'),
			]);
			const limit = Number(settings?.search?.history_size) || DEFAULT_SEARCH_HISTORY_SIZE;
			const ids = current ?? [];
			const merged = [...new Set([...ids, ...imported])].slice(0, limit);
			await storage.setItem('local:searchHistory', merged);
			return `${plural(merged.length - ids.length, 'subject')} added`;
		},
	},
	{
		id: 'knownSubjects',
		label: 'Known subjects',
		description: 'The locked subjects you marked as already known',
		async read() {
			const ids = await storage.getItem<number[]>(KNOWN_SUBJECTS_KEY);
			return ids?.length ? ids : null;
		},
		describe: data => plural(Array.isArray(data) ? data.length : 0, 'subject'),
		async write(data) {
			const imported = Array.isArray(data) ? data.filter(id => Number.isInteger(id) && id > 0) : [];
			const ids = await storage.getItem<number[]>(KNOWN_SUBJECTS_KEY) ?? [];
			const merged = [...new Set([...ids, ...imported])];
			// the ones unlocked since: dropped on the next sync (knownSubjects.ts)
			await storage.setItem(KNOWN_SUBJECTS_KEY, merged);
			return `${plural(merged.length - ids.length, 'subject')} added`;
		},
	},
	{
		id: 'apiKey',
		label: 'API key',
		description: 'To log in on another browser just by connecting Google Drive. Only in Drive backups, never in files',
		driveOnly: true,
		offByDefault: true,
		notImported: true,
		async read() {
			const key = await storage.getItem<string>('sync:apiKey');
			if (!key) return null;
			// whose it is, for the login screen's list (not needed: a failed check leaves it out)
			const check = await verifyApiKeyWithRequest(key).catch(() => null);
			return { key, username: check?.ok ? check.username : null } satisfies BackupApiKey;
		},
		describe: data => (typeof data?.key === 'string' ? `ends in ${data.key.slice(-4)}` : 'your key'),
		async write() {
			return '';
		},
	},
];

/** The part's definition (e.g. its warnings in the settings). */
export function backupPart(id: BackupPartId): BackupPart | undefined {
	return BACKUP_PARTS.find(part => part.id === id);
}

const CHOICE_KEY = 'local:backupParts';
/**
 * A backup chosen on the login screen (restored from Drive): its other parts wait here for the
 * import step (Settings → Data → Backup), which opens it once logged in. Until then, no
 * automatic backup runs (it would save this browser's data before the restore).
 */
const PENDING_RESTORE_KEY = 'session:pendingRestore';

export async function savePendingRestore(text: string): Promise<void> {
	await storage.setItem(PENDING_RESTORE_KEY, text);
}

export async function readPendingRestore(): Promise<string | null> {
	return storage.getItem<string>(PENDING_RESTORE_KEY);
}

export async function clearPendingRestore(): Promise<void> {
	await storage.removeItem(PENDING_RESTORE_KEY);
}

/** The parts switched on in the settings (all but the API key, until changed). */
export async function readBackupChoice(): Promise<BackupPartId[]> {
	const saved = await storage.getItem<BackupPartId[]>(CHOICE_KEY);
	const ids = BACKUP_PARTS.map(part => part.id);
	// a saved choice from before a part existed: the new one only if it's on by default
	return Array.isArray(saved)
		? saved.filter(id => ids.includes(id))
		: BACKUP_PARTS.filter(part => !part.offByDefault).map(part => part.id);
}

export async function saveBackupChoice(ids: BackupPartId[]): Promise<void> {
	await storage.setItem(CHOICE_KEY, [...ids]);
}

export type BackupFile = {
	app: typeof FILE_APP;
	version: number;
	exportedAt: string;
	parts: Partial<Record<BackupPartId, unknown>>;
};

/** What there is to save, and how much ("12 pages"); null: nothing. */
export async function backupContents(): Promise<Record<BackupPartId, string | null>> {
	const entries = await Promise.all(BACKUP_PARTS.map(async part => {
		// the key's describing needs no WaniKani check
		if (part.id === 'apiKey') {
			const key = await storage.getItem<string>('sync:apiKey');
			return [part.id, key ? part.describe({ key }) : null] as const;
		}
		const data = await part.read();
		return [part.id, data == null ? null : part.describe(data)] as const;
	}));
	return Object.fromEntries(entries) as Record<BackupPartId, string | null>;
}

export async function createBackup(ids: BackupPartId[], target: BackupTarget = 'file'): Promise<BackupFile> {
	const parts: BackupFile['parts'] = {};
	for (const part of BACKUP_PARTS) {
		if (!ids.includes(part.id)) continue;
		// the API key never goes into a file
		if (part.driveOnly && target !== 'drive') continue;
		const data = await part.read();
		if (data != null) parts[part.id] = data;
	}
	return { app: FILE_APP, version: FILE_VERSION, exportedAt: new Date().toISOString(), parts };
}

export function backupFileName(date = new Date()): string {
	const pad = (value: number) => String(value).padStart(2, '0');
	return `wanikani-highlighter-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/** The file's contents, checked; throws a message for the user when it isn't a backup. */
export function parseBackup(text: string): BackupFile {
	let data: any;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error('This file isn\'t a backup (it can\'t be read).');
	}
	if (data?.app !== FILE_APP || !isObject(data.parts)) throw new Error('This file isn\'t a backup of this extension.');
	if (Number(data.version) > FILE_VERSION) throw new Error('This backup comes from a newer version of the extension: update it first.');
	return data as BackupFile;
}

/** "12 pages" for each part the file has (that can be imported). */
export function describeBackup(file: BackupFile): Partial<Record<BackupPartId, string>> {
	const described: Partial<Record<BackupPartId, string>> = {};
	for (const part of BACKUP_PARTS) {
		if (part.notImported) continue;
		const data = file.parts[part.id];
		if (data != null) described[part.id] = part.describe(data);
	}
	return described;
}

/** Merges the chosen parts in; one line per part, for the result message. */
export async function restoreBackup(file: BackupFile, ids: BackupPartId[]): Promise<string[]> {
	// a plain copy: a (Vue) proxied array would be stored as an object ({ "0": …, "1": … })
	const parts: BackupFile['parts'] = JSON.parse(JSON.stringify(file.parts));
	const results: string[] = [];
	for (const part of BACKUP_PARTS) {
		const data = parts[part.id];
		if (!ids.includes(part.id) || data == null || part.notImported) continue;
		const result = await part.write(data);
		if (result) results.push(`${part.label}: ${result}`);
	}
	return results;
}
