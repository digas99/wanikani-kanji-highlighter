/**
 * Browser side panel (Chromium: chrome.sidePanel, Firefox: sidebarAction).
 *
 * Browsers only allow opening it in response to a user action (a click), so
 * `openBrowserSidePanel` must be called synchronously from that click's handler
 * (or from the background's onMessage listener for a message sent by that click).
 */

/** Subject the side panel should show (written by the background, watched by the panel). */
export const SIDEPANEL_SUBJECT_KEY = 'session:sidepanelSubject' as const;

export type SidePanelRequest = {
	characters?: string;
	subjectType?: string;
	subjectId?: number;
	at: number;
};

export type DetailsLocation = 'page' | 'sidepanel';

function chromeSidePanel(): any {
	return (globalThis as any).chrome?.sidePanel;
}

function firefoxSidebar(): any {
	return (globalThis as any).browser?.sidebarAction;
}

export function isSidePanelSupported(): boolean {
	return typeof chromeSidePanel()?.open === 'function' || typeof firefoxSidebar()?.open === 'function';
}

/** True on Firefox, where the sidebar can't be opened from a click on a web page. */
export function usesFirefoxSidebar(): boolean {
	return typeof chromeSidePanel()?.open !== 'function' && typeof firefoxSidebar()?.open === 'function';
}

/**
 * Open the side panel. Call it synchronously inside the user's click handling,
 * before any `await`, or the browser rejects it.
 */
export function openBrowserSidePanel(target: { windowId?: number; tabId?: number } = {}): boolean {
	try {
		const sidePanel = chromeSidePanel();
		if (typeof sidePanel?.open === 'function') {
			const options = target.windowId != null
				? { windowId: target.windowId }
				: target.tabId != null ? { tabId: target.tabId } : null;
			if (!options) return false;
			const result = sidePanel.open(options);
			result?.catch?.(() => {});
			return true;
		}

		const sidebar = firefoxSidebar();
		if (typeof sidebar?.open === 'function') {
			sidebar.open()?.catch?.(() => {});
			return true;
		}
	} catch {
		// not allowed here (no user action) or unsupported
	}
	return false;
}
