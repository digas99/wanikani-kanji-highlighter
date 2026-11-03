import { storage } from '#imports';
import { DEFAULT_PROXY } from '@/lib/apiClient';
import { mergeStoredSettings } from '@/utils/scripts/settingsMerge';
import {
	defaultSettings,
	type SettingsGroup,
	type SettingsState,
} from '@/utils/scripts/defaultSettings';
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

/**
 * Every storage.local key v2 uses (WXT `local:<key>` → storage.local "<key>"). Everything else
 * found there is v1.5 data (subjects, assignments, progress lists, ~MBs): deleted when migrating,
 * and again by Settings → Data → Reset subject data (leftovers of a migration that didn't finish).
 * `settings` / `blacklist` are shared with v1.5 and rewritten by this migration.
 *
 * A NEW `local:` KEY MUST BE ADDED HERE, or a reset deletes it. (`contextMenuSelectedText` is left
 * out on purpose: v1.5 used it too, and a stale one would open an old search.)
 */
export const V2_LOCAL_KEYS = new Set([
	'settings', 'blacklist', 'whitelist', 'defaultBlacklistApplied', 'defaultBlacklistRemoved',
	'highlightData', 'initialSyncComplete', 'initialSyncStarted', 'initialSyncLock',
	'initialSyncProgress', 'firstLoadDone', 'searchHistory', 'schoolKanjiMaps',
	'schoolKanjiMapsFetchedAt', 'v15MigrationComplete', 'v20UpgradeNoticeShown', 'accountUsername',
	'pendingApiKey', 'avatarFromWanikani', 'webAvatars', 'avatarSync', 'dailyActivity',
	'notifications', 'milestones', 'friends', 'reviewAlerts', 'featureNotices', 'mnemonicImages',
	'pageHistory', 'sentenceArchive', 'pageStatsSections', 'pageStatsHiddenSites',
	'pageStatsFocusSites', 'pageSentencesExcludedSites', 'driveBackup', 'driveAvatarSent',
	'backupParts', 'backupDevice', 'backupAvatar', 'badgeSummary',
]);

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

export async function deleteLegacyIndexedDb(): Promise<void> {
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

/**
 * Carry v1.5 settings over and mark the first-time setup as done, so upgraders go
 * straight to their dashboard (v1.5 always highlighted kanji by learned status,
 * which is v2's default setup). Runs for every upgrader, even without a v1.5
 * `settings` object.
 */
async function migrateLegacySettings(
	legacy: Record<string, unknown>,
): Promise<boolean> {
	const legacySettings = legacy.settings && typeof legacy.settings === 'object'
		? legacy.settings as Record<string, unknown>
		: {};

	// Note: "settings" is the same storage key in v1.5 and v2, so this read may
	// return the v1.5 object itself — only known groups are kept below.
	const stored = await storage.getItem<Partial<SettingsState>>('local:settings');
	const storedV2 = stored && typeof stored === 'object' && 'highlighter' in stored ? stored : null;
	const legacyPartial = pickLegacySettings(legacySettings);

	const merged = mergeStoredSettings(defaultSettings, {
		...(storedV2 ?? {}),
		...legacyPartial,
		highlighter: {
			...defaultSettings.highlighter,
			...(storedV2?.highlighter ?? {}),
			initial_choice_made: true,
		},
	});

	await storage.setItem('local:settings', merged);
	return Object.keys(legacyPartial).length > 0;
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

/**
 * v1.5 kept its blacklist under the same "blacklist" key v2 uses: normalize it in
 * place (v1.5 entries could include protocols / paths / "www.").
 */
async function migrateLegacyBlacklist(legacy: Record<string, unknown>): Promise<void> {
	const normalized = normalizeLegacyBlacklist(legacy.blacklist);
	if (!normalized.length) return;

	const existing = await storage.getItem<string[]>('local:blacklist');
	const merged = [...new Set([
		...normalizeLegacyBlacklist(existing),
		...normalized,
	])];
	await storage.setItem('local:blacklist', merged);
}

/**
 * Delete v1.5's data from storage.local (everything v2 doesn't use, incl. the old
 * local `apiKey` copy, which now lives in storage.sync, and the transient
 * `contextMenuSelectedText`, which would otherwise auto-open a stale search).
 */
export async function removeLegacyKeys(): Promise<void> {
	try {
		const all = await browser.storage.local.get(null);
		const stale = Object.keys(all).filter(key => {
			// WXT keeps per-key metadata under "<key>$"
			const base = key.endsWith('$') ? key.slice(0, -1) : key;
			return !V2_LOCAL_KEYS.has(base);
		});
		if (stale.length) await browser.storage.local.remove(stale);
	} catch {
		// Ignore cleanup failures.
	}
}

/** a kanji (and 々 / 〆 / ヶ, which v1.5's lists could hold) */
const KANJI_CHAR = /^[\p{Script=Han}々〆ヶ]$/u;

/**
 * v1.5's kanji lists, as single kanji. Its entries aren't always one: e.g. "昌-2285" (a kanji
 * WaniKani has twice, with its id), which joined into a highlight's character class made an
 * invalid range ("昌-2") and stopped all highlighting until the first sync.
 */
function legacyCharacters(value: unknown): string[] {
	const entries = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
	return entries
		.filter((entry): entry is string => typeof entry === 'string')
		.flatMap(entry => Array.from(entry))
		.filter(char => KANJI_CHAR.test(char));
}

/**
 * Highlight right away after the update: build v2's highlight data from v1.5's
 * kanji lists until the background sync replaces it with the full data.
 */
async function seedHighlightDataFromLegacy(legacy: Record<string, unknown>): Promise<void> {
	const existing = await storage.getItem('local:highlightData');
	if (existing) return;

	const setup = (legacy.highlight_setup && typeof legacy.highlight_setup === 'object')
		? legacy.highlight_setup as Record<string, unknown>
		: {};
	const learned = new Set(legacyCharacters(legacy.learnedKanji ?? setup.learned));
	const learnable = legacyCharacters(legacy.learnable_kanji);
	const notLearned = new Set(
		learnable.length
			? learnable.filter(char => !learned.has(char))
			: legacyCharacters(setup.notLearned),
	);
	if (!learned.size && !notLearned.size) return;

	await storage.setItem('local:highlightData', {
		kanji: {
			learned: Array.from(learned).join(''),
			notLearned: Array.from(notLearned).join(''),
		},
		vocabulary: { learned: [], notLearned: [] },
		// old timestamp: any real sync result replaces it
		updatedAt: 0,
	});
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
		await seedHighlightDataFromLegacy(legacy);
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
