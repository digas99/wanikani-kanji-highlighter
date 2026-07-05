/** Active tab in the user's browser window (not the extension popup). */
export async function getActiveBrowserTab(): Promise<browser.tabs.Tab | null> {
	try {
		const windows = await browser.windows.getAll({
			populate: true,
			windowTypes: ['normal'],
		});

		const focusedWindow = windows.find(window => window.focused)
			?? windows.sort((a, b) => (b.lastFocusTime ?? 0) - (a.lastFocusTime ?? 0))[0];

		const activeTab = focusedWindow?.tabs?.find(tab => tab.active);
		if (activeTab?.id != null) return activeTab;

		// Fallback for browsers that omit windowTypes filtering.
		const tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
		return tabs[0] ?? null;
	} catch {
		return null;
	}
}

export function parseBrowserTabSite(tab: browser.tabs.Tab | null | undefined): {
	validSite: boolean;
	activeTabSite: string | null;
	atWanikani: boolean;
} {
	if (!tab?.url) {
		return { validSite: false, activeTabSite: null, atWanikani: false };
	}

	try {
		const url = new URL(tab.url);
		const validSite = url.protocol === 'http:' || url.protocol === 'https:';
		const activeTabSite = validSite ? url.hostname.replace(/^www\./, '') : null;
		const atWanikani = activeTabSite
			? /(^|\.)wanikani\.com$/i.test(activeTabSite)
			: false;
		return { validSite, activeTabSite, atWanikani };
	} catch {
		return { validSite: false, activeTabSite: null, atWanikani: false };
	}
}
