import { storage } from '#imports';
import {
	badgeModeOf,
	getContrastTextColor,
	globalBadge,
	GLOBAL_BADGE_MODES,
	type BadgeSummary,
} from '@/utils/scripts/extensionBadge';
import { fetchSummary } from '@/utils/scripts/reviewAlerts';

/**
 * The browser-wide badges (reviews, lessons, the next reviews: extensionBadge.ts), in the
 * background. WaniKani's summary is fetched now and then (and when the popup opens); between
 * fetches the badge is worked out from it every minute (reviews come on the hour, the countdown
 * moves), no request needed.
 */

const SUMMARY_KEY = 'local:badgeSummary';
const BADGE_ALARM = 'wkh:badge';
/** a summary older than this is fetched again (lessons and reviews change as they're done) */
const REFRESH_MS = 15 * 60 * 1000;

export const isBadgeAlarm = (name: string) => name === BADGE_ALARM;

async function settingsMode() {
	return badgeModeOf(await storage.getItem<any>('local:settings'));
}

/** The minute alarm: only while a browser-wide badge is chosen. */
export async function setupBadgeAlarm(): Promise<void> {
	const global = GLOBAL_BADGE_MODES.has(await settingsMode());
	const existing = await browser.alarms.get(BADGE_ALARM);
	if (global && !existing) await browser.alarms.create(BADGE_ALARM, { delayInMinutes: 1, periodInMinutes: 1 });
	if (!global && existing) await browser.alarms.clear(BADGE_ALARM);
}

/** WaniKani's summary again (`force`: even if recent: the popup opened, the choice changed). */
export async function refreshBadgeSummary(force = false): Promise<void> {
	const saved = await storage.getItem<BadgeSummary>(SUMMARY_KEY);
	if (!force && saved && Date.now() - saved.fetchedAt < REFRESH_MS) return;
	const summary = await fetchSummary();
	if (summary) await storage.setItem<BadgeSummary>(SUMMARY_KEY, { ...summary, fetchedAt: Date.now() });
}

/**
 * The browser-wide badge, as of now. Not a browser-wide choice: it's cleared (the pages set
 * their own). `resetTabs`: the tabs' own badges go (they'd cover it), e.g. when the choice changes.
 */
export async function updateGlobalBadge({ resetTabs = false } = {}): Promise<void> {
	const mode = await settingsMode();
	const badge = globalBadge(mode, await storage.getItem<BadgeSummary>(SUMMARY_KEY));
	const text = badge?.text ?? '';
	await browser.action.setBadgeText({ text });
	if (badge) {
		await browser.action.setBadgeBackgroundColor({ color: badge.color });
		await browser.action.setBadgeTextColor({ color: getContrastTextColor(badge.color) });
	}
	await browser.action.setTitle({ title: badge?.title ? `WaniKani Kanji Highlighter: ${badge.title}` : 'WaniKani Kanji Highlighter' });
	if (resetTabs) {
		const tabs = await browser.tabs.query({}).catch(() => []);
		// null: back to the browser-wide one
		await Promise.all(tabs.map(tab => (tab.id == null ? null : browser.action.setBadgeText({ text: null as unknown as string, tabId: tab.id }).catch(() => {}))));
		// the pages send theirs again (a per-page choice: what they sent may have been cleared just now)
		for (const tab of tabs) {
			if (tab.id != null) void browser.tabs.sendMessage(tab.id, { type: 'wkh:badgeResend' }).catch(() => {});
		}
	}
}

/** Each minute (the alarm): a fresh summary when due, the badge as of now. */
export async function onBadgeAlarm(): Promise<void> {
	if (!GLOBAL_BADGE_MODES.has(await settingsMode())) return;
	await refreshBadgeSummary();
	await updateGlobalBadge();
}

/** Logged out: no summary to show. */
export async function clearBadgeSummary(): Promise<void> {
	await storage.removeItem(SUMMARY_KEY);
	await updateGlobalBadge({ resetTabs: true });
}
