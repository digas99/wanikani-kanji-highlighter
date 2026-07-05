import { storage } from '#imports';
import { DEFAULT_PROXY } from '@/lib/apiClient';
import { mergeStoredSettings } from '@/utils/scripts/settingsMerge';
import {
	defaultSettings,
	type SettingsGroup,
	type SettingsState,
} from '@/utils/scripts/defaultSettings';
import { CONTEXT_MENU_SEARCH_STORAGE_KEY } from '@/utils/scripts/contextMenuSearch';
import { normalizeSiteEntry } from '@/utils/scripts/pageList';

export const V15_MIGRATION_FLAG = 'local:v15MigrationComplete';

const LEGACY_SETTINGS_GROUPS: SettingsGroup[] = [
	'kanji_details_popup',
	'extension_icon',
	'notifications',
	'highlight_style',
	'search',
	'appearance',
	'miscellaneous',
	'extension_popup_interface',
	'profile_menus',
];

const LEGACY_KEYS_TO_REMOVE = [
	'apiKey',
	'settings',
	'initialFetch',
	'contextMenuSelectedText',
] as const;

export type V15MigrationResult = {
	migrated: boolean;
	hadLegacyData: boolean;
	migratedApiKey: boolean;
	migratedSettings: boolean;
};

function pickLegacySettings(legacy: Record<string, unknown>): Partial<SettingsState> {
	const picked: Partial<SettingsState> = {};
	for (const group of LEGACY_SETTINGS_GROUPS) {
		const value = legacy[group];
		if (value && typeof value === 'object') {
			(picked as Record<string, unknown>)[group] = value;
		}
	}
	return picked;
}

function normalizeLegacyBlacklist(list: unknown): string[] {
	if (!Array.isArray(list)) return [];
	return [...new Set(
		list
			.map(entry => (typeof entry === 'string' ? normalizeSiteEntry(entry) : null))
			.filter((entry): entry is string => Boolean(entry)),
	)];
}

async function deleteLegacyIndexedDb(): Promise<void> {
	await new Promise<void>(resolve => {
		try {
			const request = indexedDB.deleteDatabase('wanikani');
			request.onsuccess = () => resolve();
			request.onerror = () => resolve();
			request.onblocked = () => resolve();
		} catch {
			resolve();
		}
	});
}

function hasLegacyInstall(legacy: Record<string, unknown>): boolean {
	return Boolean(
		(typeof legacy.apiKey === 'string' && legacy.apiKey.trim())
		|| (legacy.settings && typeof legacy.settings === 'object')
		|| legacy.initialFetch != null
		|| legacy.assignments
		|| legacy.kanji_size
		|| legacy.radicals_size
		|| legacy.vocabulary_size
		|| legacy.userInfo,
	);
}

async function migrateLegacySettings(
	legacy: Record<string, unknown>,
): Promise<boolean> {
	const legacySettings = legacy.settings;
	if (!legacySettings || typeof legacySettings !== 'object') return false;

	const stored = await storage.getItem<Partial<SettingsState>>('local:settings');
	const legacyPartial = pickLegacySettings(legacySettings as Record<string, unknown>);
	const merged = mergeStoredSettings(defaultSettings, {
		...(stored ?? {}),
		...legacyPartial,
		highlighter: {
			...defaultSettings.highlighter,
			...(stored?.highlighter ?? {}),
			initial_choice_made: true,
		},
	});

	await storage.setItem('local:settings', merged);
	return true;
}

async function migrateLegacyApiKey(legacy: Record<string, unknown>): Promise<boolean> {
	const existing = await storage.getItem<string>('sync:apiKey');
	if (existing?.trim()) return false;

	const legacyKey = typeof legacy.apiKey === 'string' ? legacy.apiKey.trim() : '';
	if (!legacyKey) return false;

	await storage.setItem('sync:apiKey', legacyKey);
	return true;
}

async function ensureProxyServer(): Promise<void> {
	const existing = await storage.getItem<string>('sync:proxyServer');
	if (existing?.trim()) return;
	await storage.setItem('sync:proxyServer', DEFAULT_PROXY);
}

async function migrateLegacyBlacklist(legacy: Record<string, unknown>): Promise<void> {
	const existing = await storage.getItem<string[]>('local:blacklist');
	if (Array.isArray(existing) && existing.length) return;

	const normalized = normalizeLegacyBlacklist(legacy.blacklist);
	if (!normalized.length) return;

	await storage.setItem('local:blacklist', normalized);
}

async function migrateLegacyContextMenuText(legacy: Record<string, unknown>): Promise<void> {
	const existing = await storage.getItem<string>(CONTEXT_MENU_SEARCH_STORAGE_KEY);
	if (existing?.trim()) return;

	const legacyText = typeof legacy.contextMenuSelectedText === 'string'
		? legacy.contextMenuSelectedText.trim()
		: '';
	if (!legacyText) return;

	await storage.setItem(CONTEXT_MENU_SEARCH_STORAGE_KEY, legacyText);
}

async function removeLegacyKeys(): Promise<void> {
	try {
		await browser.storage.local.remove([...LEGACY_KEYS_TO_REMOVE]);
	} catch {
		// Ignore cleanup failures.
	}
}

/**
 * One-time migration from v1.5 chrome.storage.local + IndexedDB to v2.0 storage.
 * Idempotent — safe to call on every startup and from the background worker.
 */
export async function migrateFromV15IfNeeded(): Promise<V15MigrationResult> {
	const alreadyDone = await storage.getItem<boolean>(V15_MIGRATION_FLAG);
	if (alreadyDone) {
		return { migrated: false, hadLegacyData: false, migratedApiKey: false, migratedSettings: false };
	}

	let legacy: Record<string, unknown> = {};
	try {
		legacy = await browser.storage.local.get(null);
	} catch {
		await storage.setItem(V15_MIGRATION_FLAG, true);
		return { migrated: true, hadLegacyData: false, migratedApiKey: false, migratedSettings: false };
	}

	const hadLegacyData = hasLegacyInstall(legacy);
	let migratedApiKey = false;
	let migratedSettings = false;

	if (hadLegacyData) {
		await ensureProxyServer();
		migratedApiKey = await migrateLegacyApiKey(legacy);
		migratedSettings = await migrateLegacySettings(legacy);
		await migrateLegacyBlacklist(legacy);
		await migrateLegacyContextMenuText(legacy);
		await removeLegacyKeys();
		await deleteLegacyIndexedDb();
	} else {
		await ensureProxyServer();
	}

	await storage.setItem(V15_MIGRATION_FLAG, true);

	return {
		migrated: true,
		hadLegacyData,
		migratedApiKey,
		migratedSettings,
	};
}
