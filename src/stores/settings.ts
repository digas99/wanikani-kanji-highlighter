import { defineStore } from 'pinia';
import { toRaw } from 'vue';
import { storage } from '#imports';
import {
	defaultSettings,
	flamingDurtlesPattern,
	graysPattern,
	type SettingsGroup,
	type SettingsState,
} from '@/utils/scripts/defaultSettings';
import {
	createDefaultProfileMenus,
	createDefaultListMenus,
	type ListMenuKey,
	type ProfileMenuEntry,
	type ProfileSectionKey,
} from '@/utils/scripts/profileSubjects';
import { normalizeSiteEntry, DEFAULT_BLACKLIST, type PageListMode } from '@/utils/scripts/pageList';

function mergeSettings(
	base: SettingsState,
	override: Partial<SettingsState>,
): SettingsState {
	const merged = structuredClone(base) as SettingsState;

	for (const group of Object.keys(override) as SettingsGroup[]) {
		const groupValue = override[group];
		if (!groupValue || typeof groupValue !== 'object') continue;

		if (group === 'profile_menus') {
			const menus = groupValue as SettingsState['profile_menus'];
			for (const section of Object.keys(menus) as ProfileSectionKey[]) {
				const current = merged.profile_menus[section];
				const incoming = menus[section];
				if (!incoming) continue;

				merged.profile_menus[section] = {
					...current,
					...incoming,
					menu: { ...current.menu, ...incoming.menu },
					filter: { ...current.filter, ...incoming.filter },
					sort: { ...current.sort, ...incoming.sort },
				};
			}
			continue;
		}

		if (group === 'list_menus') {
			const menus = groupValue as SettingsState['list_menus'];
			for (const key of Object.keys(menus) as ListMenuKey[]) {
				const current = merged.list_menus[key];
				const incoming = menus[key];
				if (!incoming) continue;

				merged.list_menus[key] = {
					...current,
					...incoming,
					menu: { ...current.menu, ...incoming.menu },
					filter: { ...current.filter, ...incoming.filter },
					sort: { ...current.sort, ...incoming.sort },
				};
			}
			continue;
		}

		merged[group] = {
			...merged[group],
			...groupValue,
		} as SettingsState[typeof group];
	}

	return merged;
}

function cloneSettings(settings: SettingsState): SettingsState {
	return structuredClone(toRaw(settings));
}

function normalizeStoredSiteList(list: unknown): string[] {
	if (!Array.isArray(list)) return [];
	const normalized = list
		.map(entry => (typeof entry === 'string' ? normalizeSiteEntry(entry) : null))
		.filter((entry): entry is string => Boolean(entry));
	return [...new Set(normalized)];
}

function migrateExtensionIconSettings(settings: SettingsState): void {
	const icon = settings.extension_icon as SettingsState['extension_icon'] & {
		badge_mode?: string;
	};
	if (typeof icon.kanji_counter === 'boolean') {
		delete icon.badge_mode;
		return;
	}
	icon.kanji_counter = icon.badge_mode !== 'none';
	delete icon.badge_mode;
}

export const useSettingsStore = defineStore('settings', {
	state: () => ({
		loaded: false,
		settings: structuredClone(defaultSettings) as SettingsState,
		blacklist: [...DEFAULT_BLACKLIST] as string[],
		whitelist: [] as string[],
		blacklistExpanded: false,
		whitelistExpanded: false,
	}),

	getters: {
		pageListMode(): PageListMode {
			return this.settings.highlighter.page_list_mode === 'whitelist'
				? 'whitelist'
				: 'blacklist';
		},
		activePageListCount(): number {
			return this.pageListMode === 'whitelist'
				? this.whitelist.length
				: this.blacklist.length;
		},
	},

	actions: {
		async init() {
			const items = await storage.getItems([
				'local:settings',
				'local:blacklist',
				'local:whitelist',
				'local:defaultBlacklistApplied',
			]);
			const storedSettings = items.find(item => item.key === 'local:settings')?.value;
			const storedBlacklist = items.find(item => item.key === 'local:blacklist')?.value;
			const storedWhitelist = items.find(item => item.key === 'local:whitelist')?.value;
			const defaultBlacklistApplied = items.find(
				item => item.key === 'local:defaultBlacklistApplied',
			)?.value;

			if (storedSettings) {
				const override = storedSettings as Partial<SettingsState>;
				this.settings = mergeSettings(defaultSettings, override);
				migrateExtensionIconSettings(this.settings);
			}

			if (Array.isArray(storedBlacklist)) {
				this.blacklist = normalizeStoredSiteList(storedBlacklist);
			} else {
				await this.migrateLegacyBlacklist();
				if (!this.blacklist.length) {
					this.blacklist = [...DEFAULT_BLACKLIST];
					await this.persistSiteLists();
				}
			}

			if (!defaultBlacklistApplied) {
				await this.applyDefaultBlacklist();
			}

			if (Array.isArray(storedWhitelist)) {
				this.whitelist = normalizeStoredSiteList(storedWhitelist);
			}

			this.loaded = true;
		},

		async applyDefaultBlacklist() {
			let changed = false;
			for (const site of DEFAULT_BLACKLIST) {
				if (!this.blacklist.includes(site)) {
					this.blacklist.push(site);
					changed = true;
				}
			}
			if (changed) await this.persistSiteLists();
			await storage.setItem('local:defaultBlacklistApplied', true);
		},

		async migrateLegacyBlacklist() {
			try {
				const legacy = await browser.storage.local.get('blacklist');
				const list = legacy?.blacklist;
				if (!Array.isArray(list) || !list.length) return;
				this.blacklist = normalizeStoredSiteList(list);
				await this.persistSiteLists();
				await browser.storage.local.remove('blacklist');
			} catch {
				// Ignore migration failures on restricted contexts.
			}
		},

		async persistSettings() {
			await storage.setItem('local:settings', cloneSettings(this.settings));
		},

		async persistSiteLists() {
			await storage.setItems([
				{ key: 'local:blacklist', value: [...this.blacklist] },
				{ key: 'local:whitelist', value: [...this.whitelist] },
			]);
		},

		async setSetting<G extends SettingsGroup, K extends keyof SettingsState[G]>(
			group: G,
			key: K,
			value: SettingsState[G][K],
		) {
			this.settings[group][key] = value as SettingsState[G][K];
			await this.persistSettings();
		},

		async setAppearancePreset(
			preset: typeof defaultSettings.appearance
				| typeof graysPattern
				| typeof flamingDurtlesPattern,
		) {
			this.settings.appearance = {
				...this.settings.appearance,
				...structuredClone(preset),
			};
			await this.persistSettings();
		},

		async addSiteToList(list: 'blacklist' | 'whitelist', raw: string): Promise<string | null> {
			const site = normalizeSiteEntry(raw);
			if (!site) return null;

			const target = list === 'blacklist' ? this.blacklist : this.whitelist;
			if (!target.includes(site)) {
				target.push(site);
				await this.persistSiteLists();
			}
			return site;
		},

		async removeBlacklistedSite(site: string) {
			this.blacklist = this.blacklist.filter(entry => entry !== site);
			await this.persistSiteLists();
		},

		async removeWhitelistedSite(site: string) {
			this.whitelist = this.whitelist.filter(entry => entry !== site);
			await this.persistSiteLists();
		},

		async updateProfileMenuSection(
			section: ProfileSectionKey,
			group: keyof ProfileMenuEntry,
			key: string,
			value: unknown,
		) {
			const entry = this.settings.profile_menus[section];
			if (group === 'opened') {
				entry.opened = Boolean(value);
			} else {
				(entry[group] as Record<string, unknown>)[key] = value;
			}
			await this.persistSettings();
		},

		async setProfileMenuOpened(section: ProfileSectionKey, opened: boolean) {
			this.settings.profile_menus[section].opened = opened;
			await this.persistSettings();
		},

		async updateProfileMenuForAll(
			group: 'menu' | 'filter' | 'sort',
			key: string,
			value: unknown,
		) {
			(Object.keys(this.settings.profile_menus) as ProfileSectionKey[]).forEach(section => {
				if (group === 'menu') {
					(this.settings.profile_menus[section].menu as Record<string, unknown>)[key] = value;
				} else {
					(this.settings.profile_menus[section][group] as Record<string, unknown>)[key] = value;
				}
			});
			await this.persistSettings();
		},

		async updateListMenu(
			menuKey: ListMenuKey,
			group: keyof ProfileMenuEntry,
			key: string,
			value: unknown,
		) {
			const entry = this.settings.list_menus[menuKey];
			if (group === 'opened') {
				entry.opened = Boolean(value);
			} else {
				(entry[group] as Record<string, unknown>)[key] = value;
			}
			await this.persistSettings();
		},

		toggleBlacklistExpanded() {
			this.blacklistExpanded = !this.blacklistExpanded;
		},

		toggleWhitelistExpanded() {
			this.whitelistExpanded = !this.whitelistExpanded;
		},
	},
});
