import { storage } from '#imports';

export const UPGRADE_NOTICE_SHOWN_KEY = 'local:v20UpgradeNoticeShown';

export function getUpgradeNoticeUrl(): string {
	return browser.runtime.getURL('/upgrade.html');
}

/**
 * Opens the v2.0 upgrade notice tab once for users coming from v1.5.
 */
export async function maybeOpenUpgradeNotice(options: {
	hadLegacyMigration: boolean;
	migratedApiKey: boolean;
}): Promise<void> {
	if (await storage.getItem<boolean>(UPGRADE_NOTICE_SHOWN_KEY)) return;
	if (!options.hadLegacyMigration && !options.migratedApiKey) return;

	try {
		await browser.tabs.create({ url: getUpgradeNoticeUrl(), active: true });
		await storage.setItem(UPGRADE_NOTICE_SHOWN_KEY, true);
	} catch {
		// Leave the flag unset so a later startup can retry.
	}
}
