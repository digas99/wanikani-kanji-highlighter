import { storage } from '#imports';
import { addNotifications } from './notifications';

/**
 * "Today" and "Yesterday" activity, without WaniKani's reviews endpoint (no longer available).
 *
 * Review statistics only hold running totals per subject (meaning / reading answered right
 * and wrong), so we keep the last totals we saw and compare. Changes are fetched with
 * `updated_after`, which is cheap: every hour in the background, and when the popup opens.
 *
 * For each day we keep, copy-on-write, what a subject's totals and SRS stage were when the
 * day started (only for subjects that changed that day); the day's numbers are the
 * differences. Days are the user's local calendar days.
 */

const STORAGE_KEY = 'local:dailyActivity';
/** Finished days kept (a few bytes each; enough for a yearly view later). */
const HISTORY_DAYS = 400;
/** The popup and the background both sync; skip if one just did. */
const MIN_SYNC_INTERVAL_MS = 2 * 60 * 1000;
/** Fetch a little before the last sync: applying the same change twice is harmless. */
const SYNC_OVERLAP_MS = 60 * 1000;

/** meaning correct, meaning incorrect, reading correct, reading incorrect */
type Totals = [number, number, number, number];
type IdSet = Record<string, 1>;

interface DayTracking {
	date: string;
	/** Tracking began after midnight (first sync ever): reviews before it can't be scored. */
	trackedFrom: string | null;
	baseStats: Record<string, Totals | null>;
	baseStages: Record<string, number | null>;
	reviewed: IdSet;
	/** reviewed, but their totals before the review are unknown (see trackedFrom) */
	unknown: IdSet;
	lessons: IdSet;
	passed: IdSet;
	burned: IdSet;
	/** when each reviewed subject was last answered (its statistics' update time, ms) */
	times?: Record<string, number>;
}

interface ActivityState {
	version: 1;
	syncedAt: string | null;
	stats: Record<string, Totals>;
	stages: Record<string, number>;
	day: DayTracking | null;
	history: Record<string, DaySummary>;
	/** the day the "Yesterday" recap was last shown (it shows on the day's first visit) */
	recapShownOn: string | null;
}

export interface DaySummary {
	date: string;
	/** finished reviews: each one ends with the meaning answered right once */
	reviews: number;
	/** subjects reviewed */
	items: number;
	/** reviewed subjects that couldn't be scored (at least one review each; see trackedFrom) */
	unscored: number;
	/** answered questions (meaning and reading count separately), retries included */
	correct: number;
	incorrect: number;
	/** SRS stage moves of the reviewed subjects (net, if reviewed more than once) */
	up: number;
	down: number;
	lessons: number;
	passed: number;
	burned: number;
	/** set when some reviews couldn't be scored: tracking started at this time */
	trackedFrom: string | null;
	/** the reviewed subjects by result, for the "Reviewed" list */
	subjects: { mistakes: number[]; correct: number[]; unscored: number[] };
	/** each reviewed subject's SRS stage before → after the day's reviews (null: not known) */
	stages?: Record<string, [number | null, number | null]>;
	/** when each reviewed subject was last answered that day (ms); days before this was kept: none */
	times?: Record<string, number>;
}

function emptyState(): ActivityState {
	return { version: 1, syncedAt: null, stats: {}, stages: {}, day: null, history: {}, recapShownOn: null };
}

export function dayKey(date: Date): string {
	const pad = (value: number) => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dayStart(key: string): number {
	const [year, month, day] = key.split('-').map(Number);
	return new Date(year, month - 1, day).getTime();
}

function nextDayStart(key: string): number {
	const [year, month, day] = key.split('-').map(Number);
	return new Date(year, month - 1, day + 1).getTime();
}

function newDay(date: string, trackedFrom: string | null = null): DayTracking {
	return { date, trackedFrom, baseStats: {}, baseStages: {}, reviewed: {}, unknown: {}, lessons: {}, passed: {}, burned: {} };
}

function totalsOf(stat: any): Totals {
	return [
		stat.meaning_correct ?? 0,
		stat.meaning_incorrect ?? 0,
		stat.reading_correct ?? 0,
		stat.reading_incorrect ?? 0,
	];
}

function sameTotals(a: Totals, b: Totals): boolean {
	return a.every((value, index) => value === b[index]);
}

function inRange(timestamp: string | null | undefined, from: number, to: number): boolean {
	if (!timestamp) return false;
	const time = Date.parse(timestamp);
	return time >= from && time < to;
}

/**
 * Apply changed review statistics. With a day, changes inside [from, to) count for it.
 * `firstSync`: nothing was known before, so today's reviews can't be scored.
 */
function applyStats(state: ActivityState, entries: any[], day: DayTracking | null, from: number, to: number, firstSync = false) {
	for (const entry of entries) {
		const id = String(entry.subject_id);
		const next = totalsOf(entry);
		const previous = state.stats[id];
		if (day && inRange(entry.data_updated_at, from, to)) {
			const at = Date.parse(entry.data_updated_at);
			const noteTime = () => {
				day.times ??= {};
				day.times[id] = Math.max(day.times[id] ?? 0, at);
			};
			if (firstSync) {
				noteTime();
				day.reviewed[id] = 1;
				day.unknown[id] = 1;
			} else if (!previous || !sameTotals(previous, next)) {
				if (!(id in day.baseStats)) day.baseStats[id] = previous ?? null;
				day.reviewed[id] = 1;
				noteTime();
			}
		}
		state.stats[id] = next;
	}
}

function applyAssignments(state: ActivityState, entries: any[], day: DayTracking | null, from: number, to: number, firstSync = false) {
	for (const entry of entries) {
		const id = String(entry.subject_id);
		if (day) {
			if (!firstSync && inRange(entry.data_updated_at, from, to) && !(id in day.baseStages)) {
				day.baseStages[id] = state.stages[id] ?? null;
			}
			if (inRange(entry.started_at, from, to)) day.lessons[id] = 1;
			if (inRange(entry.passed_at, from, to)) day.passed[id] = 1;
			if (inRange(entry.burned_at, from, to)) day.burned[id] = 1;
		}
		if (typeof entry.srs_stage === 'number') state.stages[id] = entry.srs_stage;
	}
}

export function summarizeDay(state: ActivityState, day: DayTracking): DaySummary {
	const summary: DaySummary = {
		date: day.date,
		reviews: 0,
		items: 0,
		unscored: 0,
		correct: 0,
		incorrect: 0,
		up: 0,
		down: 0,
		lessons: Object.keys(day.lessons).length,
		passed: Object.keys(day.passed).length,
		burned: Object.keys(day.burned).length,
		trackedFrom: null,
		subjects: { mistakes: [], correct: [], unscored: [] },
		stages: {},
		times: {},
	};

	for (const id of Object.keys(day.reviewed)) {
		summary.items += 1;
		summary.stages![id] = [day.baseStages[id] ?? null, state.stages[id] ?? null];
		if (day.times?.[id]) summary.times![id] = day.times[id];
		if (day.unknown[id]) {
			summary.unscored += 1;
			summary.trackedFrom = day.trackedFrom;
			summary.subjects.unscored.push(Number(id));
			continue;
		}
		const now = state.stats[id];
		if (!now) continue;
		const base = day.baseStats[id] ?? [0, 0, 0, 0];
		const delta = now.map((value, index) => Math.max(0, value - base[index]));
		summary.reviews += delta[0];
		summary.correct += delta[0] + delta[2];
		summary.incorrect += delta[1] + delta[3];
		summary.subjects[delta[1] + delta[3] ? 'mistakes' : 'correct'].push(Number(id));

		const baseStage = day.baseStages[id];
		const stage = state.stages[id];
		if (baseStage != null && stage != null) {
			if (stage > baseStage) summary.up += 1;
			else if (stage < baseStage) summary.down += 1;
		}
	}

	return summary;
}

async function loadState(): Promise<ActivityState> {
	const saved = await storage.getItem<ActivityState>(STORAGE_KEY);
	return saved?.version === 1 ? saved : emptyState();
}

function pruneHistory(state: ActivityState) {
	const keys = Object.keys(state.history).sort();
	for (const key of keys.slice(0, Math.max(0, keys.length - HISTORY_DAYS))) {
		delete state.history[key];
	}
}

async function runSync(manager: any, force: boolean): Promise<ActivityState> {
	const state = await loadState();
	const startedAt = new Date();
	if (!force && state.syncedAt && startedAt.getTime() - Date.parse(state.syncedAt) < MIN_SYNC_INTERVAL_MS) {
		return state;
	}

	const since = state.syncedAt ? new Date(Date.parse(state.syncedAt) - SYNC_OVERLAP_MS) : null;
	const [stats, assignments] = await Promise.all([
		manager.fetchReviewStatisticsSince(since),
		manager.fetchAssignmentsSince(since),
	]);
	// try again on the next sync; nothing is lost, `since` stays where it was
	if (!Array.isArray(stats) || !Array.isArray(assignments)) return state;

	const today = dayKey(startedAt);
	const todayStart = dayStart(today);
	/** a day closed by this sync: it goes into the notifications history */
	let finishedDay: DaySummary | null = null;

	if (!state.syncedAt) {
		// first sync: everything as it is now. Today's lessons / Guru / burns are still
		// exact (they have timestamps); today's earlier reviews are known but not scored.
		state.day = newDay(today, startedAt.toISOString());
		applyStats(state, stats, state.day, todayStart, Infinity, true);
		applyAssignments(state, assignments, state.day, todayStart, Infinity, true);
	} else {
		const byTime = (entry: any) => Date.parse(entry.data_updated_at) || 0;
		let pendingStats = stats;
		let pendingAssignments = assignments;

		if (state.day && state.day.date !== today) {
			// the previous tracked day is over: its last changes, then its summary
			const previous = state.day;
			const from = dayStart(previous.date);
			const end = nextDayStart(previous.date);
			applyStats(state, pendingStats.filter(entry => byTime(entry) < end), previous, from, end);
			applyAssignments(state, pendingAssignments.filter(entry => byTime(entry) < end), previous, from, end);
			state.history[previous.date] = summarizeDay(state, previous);
			finishedDay = state.history[previous.date];
			pendingStats = pendingStats.filter(entry => byTime(entry) >= end);
			pendingAssignments = pendingAssignments.filter(entry => byTime(entry) >= end);
			state.day = null;
		}

		// days without any sync in between (browser closed): totals only, not attributed
		applyStats(state, pendingStats.filter(entry => byTime(entry) < todayStart), null, 0, 0);
		applyAssignments(state, pendingAssignments.filter(entry => byTime(entry) < todayStart), null, 0, 0);

		state.day ??= newDay(today);
		const end = nextDayStart(today);
		applyStats(state, pendingStats.filter(entry => byTime(entry) >= todayStart), state.day, todayStart, end);
		applyAssignments(state, pendingAssignments.filter(entry => byTime(entry) >= todayStart), state.day, todayStart, end);
	}

	state.syncedAt = startedAt.toISOString();
	pruneHistory(state);
	// the popup may have marked the recap as seen while we were fetching
	const latest = await storage.getItem<ActivityState>(STORAGE_KEY);
	if (latest?.recapShownOn) state.recapShownOn = latest.recapShownOn;
	await storage.setItem(STORAGE_KEY, state);
	if (finishedDay) await addNotifications([daySummaryNotification(finishedDay)]);
	return state;
}

/** "12 reviews · 92% correct · 1 lesson" (the recap's wording), for a finished day. */
export function daySummaryText(summary: DaySummary): string {
	const { reviews, unscored = 0, correct, incorrect, lessons, passed, burned } = summary;
	const answered = correct + incorrect;
	const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
	const parts = [
		reviews + unscored && plural(reviews + unscored, 'review'),
		answered && `${Math.round((correct / answered) * 100)}% correct`,
		lessons && plural(lessons, 'lesson'),
		passed && `${passed} passed`,
		burned && `${burned} burned`,
	].filter(Boolean);
	return parts.length ? parts.join(' · ') : 'No reviews or lessons.';
}

function daySummaryNotification(summary: DaySummary) {
	const label = new Date(dayStart(summary.date)).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
	return {
		kind: 'daily_summary' as const,
		title: `Daily summary: ${label}`,
		text: daySummaryText(summary),
		// the day after it ended (the summary is about that day, not about when it was noticed)
		at: nextDayStart(summary.date),
		route: summary.items ? { name: 'Reviewed', query: { date: summary.date } } : undefined,
	};
}

let running: Promise<ActivityState> | null = null;

/** Fetch what changed since the last sync and update today's activity (one run at a time). */
export function syncDailyActivity(manager: any, { force = false } = {}): Promise<ActivityState> {
	if (!manager) return loadState();
	running ??= runSync(manager, force).finally(() => { running = null; });
	return running;
}

export interface ActivityView {
	/** null until the first sync finished */
	today: DaySummary | null;
	yesterday: DaySummary | null;
	syncedAt: string | null;
	/** show the "Yesterday" recap (first visit of the day) */
	showRecap: boolean;
	/** every correct answer ever (meaning and reading), for the accolades; null until synced */
	correctAnswers: number | null;
}

export function activityView(state: ActivityState, now = new Date()): ActivityView {
	const today = dayKey(now);
	const yesterdayDate = new Date(now);
	yesterdayDate.setDate(yesterdayDate.getDate() - 1);
	const yesterdayKey = dayKey(yesterdayDate);

	let todaySummary: DaySummary | null = null;
	if (state.day?.date === today) todaySummary = summarizeDay(state, state.day);
	else if (state.syncedAt) todaySummary = summarizeDay(state, newDay(today));

	// yesterday is still the tracked day when nothing synced since midnight
	const yesterday = state.day?.date === yesterdayKey
		? summarizeDay(state, state.day)
		: state.history[yesterdayKey] ?? null;

	return {
		today: todaySummary,
		yesterday,
		syncedAt: state.syncedAt,
		// a quiet day too: the recap then nudges towards the waiting reviews
		showRecap: Boolean(yesterday && state.recapShownOn !== today),
		correctAnswers: state.syncedAt
			? Object.values(state.stats).reduce((sum, [meaning, , reading]) => sum + meaning + reading, 0)
			: null,
	};
}

export async function readActivityView(): Promise<ActivityView> {
	return activityView(await loadState());
}

/** One day's summary: today (or the day still being tracked) live, earlier days from history. */
export async function readDaySummary(date: string): Promise<DaySummary | null> {
	const state = await loadState();
	if (state.day?.date === date) return summarizeDay(state, state.day);
	return state.history[date] ?? null;
}

/** The recap is a once-a-day thing: remember it was shown today. */
export async function markRecapShown(now = new Date()) {
	const state = await loadState();
	state.recapShownOn = dayKey(now);
	await storage.setItem(STORAGE_KEY, state);
}

export function watchDailyActivity(callback: (view: ActivityView) => void): () => void {
	return storage.watch<ActivityState>(STORAGE_KEY, state => callback(activityView(state ?? emptyState())));
}

/**
 * What a backup keeps of the activity: the finished days, and the tracking (the totals and SRS
 * stages last seen, when, and the day in progress). Both come from the account, not the browser:
 * restored elsewhere the same day, the tracking goes on from there and today stays scored.
 */
export type ActivityBackup = {
	format: 2;
	history: Record<string, DaySummary>;
	tracking: Pick<ActivityState, 'syncedAt' | 'stats' | 'stages' | 'day'> | null;
};

export async function readActivityBackup(): Promise<ActivityBackup> {
	const { history, syncedAt, stats, stages, day } = await loadState();
	return { format: 2, history, tracking: syncedAt ? { syncedAt, stats, stages, day } : null };
}

/** Backups from before the tracking was kept held the days only. */
function asActivityBackup(data: unknown): ActivityBackup {
	const value = (data ?? {}) as any;
	return value.format === 2
		? { format: 2, history: value.history ?? {}, tracking: value.tracking ?? null }
		: { format: 2, history: value, tracking: null };
}

/** "12 days, and today" */
export function describeActivityBackup(data: unknown): { days: number; today: boolean } {
	const backup = asActivityBackup(data);
	return { days: Object.keys(backup.history).length, today: Boolean(backup.tracking?.day) };
}

/** When tracking began on its day (ISO), or null: from the day's start (every review scored). */
const trackedFromOf = (day: DayTracking | null | undefined) => day?.trackedFrom ?? null;

/**
 * The backup's tracking replaces this browser's when it's better: this browser has none, or
 * only started partway through its day (logged in again, a new browser), and the backup's began
 * earlier. The next sync then fetches every change since the backup's, scoring all of today.
 */
function betterTracking(local: ActivityState, incoming: ActivityBackup['tracking']): boolean {
	if (!incoming?.syncedAt || !incoming.day || typeof incoming.stats !== 'object') return false;
	if (!local.syncedAt || !local.day) return true;
	const localFrom = trackedFromOf(local.day);
	// this browser tracks its day from the start: nothing better to take
	if (!localFrom) return false;
	const incomingFrom = trackedFromOf(incoming.day);
	// the backup's day is complete, or started earlier than this browser's tracking
	return !incomingFrom || Date.parse(incomingFrom) < Date.parse(localFrom) || incoming.day.date < local.day.date;
}

/**
 * A backup's activity: its days added where this browser has none (its own stay as they are),
 * and its tracking taken when better (see betterTracking).
 */
export async function importActivityBackup(data: unknown): Promise<{ days: number; tracking: boolean }> {
	const backup = asActivityBackup(data);
	const state = await loadState();
	let days = 0;
	for (const [date, summary] of Object.entries(backup.history ?? {})) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !summary || typeof summary.reviews !== 'number') continue;
		// the day being tracked here: not replaced by a summary from elsewhere
		if (state.history[date] || state.day?.date === date) continue;
		state.history[date] = summary;
		days++;
	}
	const tracking = betterTracking(state, backup.tracking);
	if (tracking) {
		const { syncedAt, stats, stages, day } = backup.tracking!;
		Object.assign(state, { syncedAt, stats, stages, day });
		// its day may be in the history added above (a later backup closed it): not twice
		if (day && state.history[day.date]) delete state.history[day.date];
	}
	if (!days && !tracking) return { days, tracking };
	pruneHistory(state);
	await storage.setItem(STORAGE_KEY, state);
	return { days, tracking };
}

/** Another account (or logged out): its history isn't ours. */
export async function clearDailyActivity() {
	await storage.removeItem(STORAGE_KEY);
}
