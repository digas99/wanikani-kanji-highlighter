import {
	type SettingsGroup,
	type SettingsState,
} from '@/utils/scripts/defaultSettings';
import {
	type ListMenuKey,
	type ProfileSectionKey,
} from '@/utils/scripts/profileSubjects';

export function mergeSettings(
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

export function migrateExtensionIconSettings(settings: SettingsState): void {
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

export function mergeStoredSettings(
	base: SettingsState,
	override: Partial<SettingsState>,
): SettingsState {
	const merged = mergeSettings(base, override);
	migrateExtensionIconSettings(merged);
	return merged;
}
