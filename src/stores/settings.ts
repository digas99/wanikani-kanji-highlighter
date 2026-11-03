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
	createDefaultProfileMenuEntry,
	type ListMenuKey,
	type ProfileMenuEntry,
	type ProfileSectionKey,
} from '@/utils/scripts/profileSubjects';
import { normalizeSiteEntry, FORMER_DEFAULT_BLACKLIST, type PageListMode } from '@/utils/scripts/pageList';
import {
	createLookupLinkId,
	resolveLookupLinks,
	sanitizeLookupLinks,
	type LookupLink,
} from '@/utils/scripts/lookupLinks';
import {
	mergeSettings,
	mergeStoredSettings,
	migrateExtensionIconSettings,
} from '@/utils/scripts/settingsMerge';

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

export { mergeStoredSettings } from '@/utils/scripts/settingsMerge';

export const useSettingsStore = defineStore('settings', {
	state: () => ({
		loaded: false,
		settings: structuredClone(defaultSettings) as SettingsState,
		blacklist: [] as string[],
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
				'local:defaultBlacklistRemoved',
			]);
			const storedSettings = items.find(item => item.key === 'local:settings')?.value;
			const storedBlacklist = items.find(item => item.key === 'local:blacklist')?.value;
			const storedWhitelist = items.find(item => item.key === 'local:whitelist')?.value;
			const defaultBlacklistApplied = items.find(
				item => item.key === 'local:defaultBlacklistApplied',
			)?.value;
			const defaultBlacklistRemoved = items.find(
				item => item.key === 'local:defaultBlacklistRemoved',
			)?.value;

			if (storedSettings) {
				const override = storedSettings as Partial<SettingsState>;
				this.settings = mergeSettings(defaultSettings, override);
				migrateExtensionIconSettings(this.settings);
				// lists saved before WaniKani was a default lookup link get it once
				if (!override.lookup?.wanikani_added) {
					this.settings.lookup = {
						links: resolveLookupLinks(override.lookup, defaultSettings.lookup.links),
						wanikani_added: true,
					};
					await this.persistSettings();
				}
			}

			if (Array.isArray(storedBlacklist)) {
				this.blacklist = normalizeStoredSiteList(storedBlacklist);
			} else {
				await this.migrateLegacyBlacklist();
			}

			// installs that got the former default blacklist automatically: unblock it once
			if (defaultBlacklistApplied && !defaultBlacklistRemoved) {
				await this.removeFormerDefaultBlacklist();
			}

			if (Array.isArray(storedWhitelist)) {
				this.whitelist = normalizeStoredSiteList(storedWhitelist);
			}

			this.loaded = true;
		},

		async removeFormerDefaultBlacklist() {
			const former = new Set<string>(FORMER_DEFAULT_BLACKLIST);
			const kept = this.blacklist.filter(site => !former.has(site));
			if (kept.length !== this.blacklist.length) {
				this.blacklist = kept;
				await this.persistSiteLists();
			}
			await storage.setItem('local:defaultBlacklistRemoved', true);
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
			// a list without saved settings yet starts from the defaults
			const entry = this.settings.list_menus[menuKey] ??= createDefaultProfileMenuEntry();
			if (group === 'opened') {
				entry.opened = Boolean(value);
			} else {
				(entry[group] as Record<string, unknown>)[key] = value;
			}
			await this.persistSettings();
		},

		/** Subject lookup buttons (Settings → Details → Lookup links). */
		async addLookupLink(link: Omit<LookupLink, 'id'>) {
			const links = sanitizeLookupLinks(this.settings.lookup?.links);
			links.push({ ...link, id: createLookupLinkId() });
			this.settings.lookup = { ...(this.settings.lookup ?? {}), links };
			await this.persistSettings();
		},

		async updateLookupLink(id: string, patch: Partial<Omit<LookupLink, 'id'>>) {
			const links = sanitizeLookupLinks(this.settings.lookup?.links)
				.map(link => (link.id === id ? { ...link, ...patch } : link));
			this.settings.lookup = { ...(this.settings.lookup ?? {}), links };
			await this.persistSettings();
		},

		async removeLookupLink(id: string) {
			const links = sanitizeLookupLinks(this.settings.lookup?.links).filter(link => link.id !== id);
			this.settings.lookup = { ...(this.settings.lookup ?? {}), links };
			await this.persistSettings();
		},

		async moveLookupLink(id: string, direction: -1 | 1) {
			const links = sanitizeLookupLinks(this.settings.lookup?.links);
			const index = links.findIndex(link => link.id === id);
			const target = index + direction;
			if (index < 0 || target < 0 || target >= links.length) return;
			[links[index], links[target]] = [links[target], links[index]];
			this.settings.lookup = { ...(this.settings.lookup ?? {}), links };
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
