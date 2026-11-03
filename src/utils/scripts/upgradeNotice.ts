import { storage } from '#imports';

export const UPGRADE_NOTICE_SHOWN_KEY = 'local:v20UpgradeNoticeShown';

/** The page: for an update from v1, or (`fresh`) a first install (other words, no carried-over data). */
export function getUpgradeNoticeUrl(fresh = false): string {
	return browser.runtime.getURL(fresh ? '/upgrade.html?fresh=1' : '/upgrade.html');
}

/** The browser's update from a version before 2.0 (onInstalled's previousVersion). */
export const isUpdateFromV1 = (previousVersion?: string) => /^[01]\./.test(previousVersion ?? '');

/**
 * Opens the What's new in 2.0 tab once: for users coming from v1 (the update from a 1.x version,
 * or v1's data found and migrated in storage), and for a first install of 2.0 (`freshInstall`).
 */
export async function maybeOpenUpgradeNotice(options: {
	hadLegacyMigration?: boolean;
	migratedApiKey?: boolean;
	updatedFromV1?: boolean;
	freshInstall?: boolean;
}): Promise<void> {
	if (await storage.getItem<boolean>(UPGRADE_NOTICE_SHOWN_KEY)) return;
	if (!options.hadLegacyMigration && !options.migratedApiKey && !options.updatedFromV1 && !options.freshInstall) return;

	try {
		await browser.tabs.create({ url: getUpgradeNoticeUrl(options.freshInstall === true), active: true });
		await storage.setItem(UPGRADE_NOTICE_SHOWN_KEY, true);
	} catch {
		// Leave the flag unset so a later startup can retry.
	}
}
