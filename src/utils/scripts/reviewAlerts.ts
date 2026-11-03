import { storage } from '#imports';
import { defaultSettings } from '@/utils/scripts/defaultSettings';
import { showBrowserNotification } from '@/utils/scripts/browserNotification';

/**
 * Browser notifications (background only; too frequent for the popup's notification history):
 * - new reviews: checked right after each hour, when WaniKani makes reviews available
 *   ("20 more reviews" — "10 lessons and 509 reviews");
 * - a daily reminder at a chosen time, when something is waiting.
 * Clicking one opens WaniKani's reviews (or lessons) session.
 */

const REVIEWS_ALARM = 'wkh:reviewsCheck';
const REMINDER_ALARM = 'wkh:dailyReminder';
const STATE_KEY = 'local:reviewAlerts';
const SUMMARY_URL = 'https://api.wanikani.com/v2/summary';
const REVIEWS_PAGE_URL = 'https://www.wanikani.com/subjects/review';
const LESSONS_PAGE_URL = 'https://www.wanikani.com/subjects/lesson';
/** after the hour: the reviews are there by then */
const CHECK_DELAY_MS = 20 * 1000;

type AlertSettings = { newReviews: boolean; dailyReminder: boolean; reminderHour: number; reminderMinute: number };

/** "19:30" → [19, 30]; null if it isn't a time */
function parseTime(value: unknown): [number, number] | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? ''));
	if (!match) return null;
	const [hour, minute] = [Number(match[1]), Number(match[2])];
	return hour < 24 && minute < 60 ? [hour, minute] : null;
}

type AlertsState = {
	/**
	 * Reviews due in the coming hours, as of the last check (available_at → count). WaniKani's
	 * summary lumps everything already available into the current hour, so what's new is what
	 * was still upcoming at the last check.
	 */
	upcoming: Record<string, number>;
	checkedAt: number;
};

export function readAlertSettings(settings: any): AlertSettings {
	const defaults = defaultSettings.notifications;
	const saved = settings?.notifications ?? {};
	const [reminderHour, reminderMinute] = parseTime(saved.daily_reminder_time) ?? parseTime(defaults.daily_reminder_time)!;
	return {
		newReviews: saved.review_alerts ?? defaults.review_alerts,
		dailyReminder: saved.daily_reminder ?? defaults.daily_reminder,
		reminderHour,
		reminderMinute,
	};
}

function nextHourAt(now = Date.now()): number {
	const next = new Date(now);
	next.setMinutes(60, 0, 0);
	return next.getTime() + CHECK_DELAY_MS;
}

function nextReminderAt(hour: number, minute: number, now = Date.now()): number {
	const at = new Date(now);
	at.setHours(hour, minute, 0, 0);
	if (at.getTime() <= now) at.setDate(at.getDate() + 1);
	return at.getTime();
}

/** (Re)creates or removes the alarms to match the settings. */
export async function setupReviewAlerts(): Promise<void> {
	const alerts = readAlertSettings(await storage.getItem('local:settings'));

	if (alerts.newReviews) {
		// not again if it's there: that would push the next check back
		if (!(await browser.alarms.get(REVIEWS_ALARM))) {
			await browser.alarms.create(REVIEWS_ALARM, { when: nextHourAt(), periodInMinutes: 60 });
			// what's upcoming now: the first check then only tells what's new
			void checkNewReviews({ baselineOnly: true });
		}
	} else {
		await browser.alarms.clear(REVIEWS_ALARM);
		await storage.removeItem(STATE_KEY);
	}

	const reminderAt = nextReminderAt(alerts.reminderHour, alerts.reminderMinute);
	const reminder = await browser.alarms.get(REMINDER_ALARM);
	if (!alerts.dailyReminder) await browser.alarms.clear(REMINDER_ALARM);
	else if (reminder?.scheduledTime !== reminderAt) await browser.alarms.create(REMINDER_ALARM, { when: reminderAt });
}

export function isReviewAlertsAlarm(name: string): boolean {
	return name === REVIEWS_ALARM || name === REMINDER_ALARM;
}

export async function onReviewAlertsAlarm(name: string): Promise<void> {
	if (name === REVIEWS_ALARM) await checkNewReviews();
	if (name === REMINDER_ALARM) {
		// one at a time: the next one is set for tomorrow's time (not a fixed period, which DST shifts)
		await setupReviewAlerts();
		await remind();
	}
}

export async function clearReviewAlerts(): Promise<void> {
	await storage.removeItem(STATE_KEY);
}

type Summary = { lessons: number; reviews: number; upcoming: Record<string, number> };

export async function fetchSummary(): Promise<Summary | null> {
	const apiKey = await storage.getItem<string>('sync:apiKey');
	if (!apiKey) return null;
	try {
		const response = await fetch(SUMMARY_URL, { headers: { Authorization: `Bearer ${apiKey}` } });
		if (!response.ok) return null;
		const { data } = await response.json();
		const now = Date.now();
		const count = (entries: any[]) => entries.reduce((sum, entry) => sum + (entry.subject_ids?.length ?? 0), 0);
		const reviews = (data?.reviews ?? []) as Array<{ available_at: string; subject_ids: number[] }>;
		const upcoming: Record<string, number> = {};
		for (const entry of reviews) {
			if (new Date(entry.available_at).getTime() > now && entry.subject_ids?.length) upcoming[entry.available_at] = entry.subject_ids.length;
		}
		return {
			lessons: count(data?.lessons ?? []),
			reviews: count(reviews.filter(entry => new Date(entry.available_at).getTime() <= now)),
			upcoming,
		};
	} catch {
		return null;
	}
}

function plural(count: number, word: string): string {
	return `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`;
}

/** "10 lessons and 509 reviews" (what's there). */
function waitingText({ lessons, reviews }: Summary): string {
	if (lessons && reviews) return `${plural(lessons, 'lesson')} and ${plural(reviews, 'review')}`;
	if (lessons) return plural(lessons, 'lesson');
	return plural(reviews, 'review');
}

async function checkNewReviews({ baselineOnly = false } = {}): Promise<void> {
	const summary = await fetchSummary();
	if (!summary) return;
	const now = Date.now();
	const previous = await storage.getItem<AlertsState>(STATE_KEY);
	await storage.setItem<AlertsState>(STATE_KEY, { upcoming: summary.upcoming, checkedAt: now });
	if (baselineOnly || !previous) return;

	// due since the last check (a sleeping computer may have missed a few hours)
	const arrived = Object.entries(previous.upcoming)
		.filter(([at]) => new Date(at).getTime() <= now)
		.reduce((sum, [, count]) => sum + count, 0);
	if (!arrived || !summary.reviews) return;

	await notify('reviews', `${arrived.toLocaleString()} more review${arrived === 1 ? '' : 's'}`, `${waitingText(summary)} available`);
}

async function remind(): Promise<void> {
	const summary = await fetchSummary();
	// nothing waiting: nothing to remind of
	if (!summary || (!summary.reviews && !summary.lessons)) return;
	await notify(summary.reviews ? 'reviews' : 'lessons', 'Time for some WaniKani', `${waitingText(summary)} waiting`);
}

async function notify(target: 'reviews' | 'lessons', title: string, message: string): Promise<void> {
	// the id says where clicking it goes (the service worker may have restarted by then)
	await showBrowserNotification(`wkh-${target}-${Date.now()}`, title, message);
}

export function onReviewAlertClicked(notificationId: string): void {
	if (!notificationId.startsWith('wkh-reviews-') && !notificationId.startsWith('wkh-lessons-')) return;
	const url = notificationId.startsWith('wkh-lessons-') ? LESSONS_PAGE_URL : REVIEWS_PAGE_URL;
	void browser.tabs.create({ url });
	void browser.notifications.clear(notificationId);
}
