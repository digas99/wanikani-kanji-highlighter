import { getActiveBrowserTab } from '@/utils/scripts/activeBrowserTab';

/**
 * Ask the active tab's content script to open a subject in its in-page details popup.
 * Resolves false when that isn't possible (restricted page, blocked site, popup disabled…).
 */
export async function showSubjectInPage(
	subjectId: number,
	options: { switchToPage?: boolean } = {},
): Promise<boolean> {
	if (!Number.isFinite(subjectId)) return false;
	try {
		const tab = await getActiveBrowserTab();
		if (tab?.id == null) return false;
		const response = await browser.tabs.sendMessage(tab.id, {
			type: 'wkh:showSubject',
			subjectId,
			// side panel → page: the page switches back to its in-page popup right away
			...(options.switchToPage ? { switchToPage: true } : {}),
		});
		return response?.shown === true;
	} catch {
		// no content script on this tab
		return false;
	}
}
