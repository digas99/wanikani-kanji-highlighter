import { WANIKANI_COLOR } from '@/utils/scripts/defaultSettings';

/**
 * What the extension icon's badge shows (Settings → General → Extension icon).
 * Per page (each tab its own): the highlighted subjects, the page's JLPT level.
 * For the whole browser (from WaniKani's summary): reviews or lessons now, the next reviews'
 * count, or the time until them.
 */
export type BadgeMode = 'subjects' | 'reading_level' | 'reading_joyo' | 'reviews' | 'lessons' | 'next_reviews' | 'next_time' | 'none';

export const BADGE_MODE_OPTIONS: Array<{ label: string; value: BadgeMode }> = [
	{ label: 'Highlighted subjects', value: 'subjects' },
	{ label: "Page's JLPT level", value: 'reading_level' },
	{ label: "Page's Jōyō grade", value: 'reading_joyo' },
	{ label: 'Reviews available', value: 'reviews' },
	{ label: 'Lessons available', value: 'lessons' },
	{ label: 'Next reviews (how many)', value: 'next_reviews' },
	{ label: 'Next reviews (when)', value: 'next_time' },
	{ label: 'Nothing', value: 'none' },
];

const MODES = new Set(BADGE_MODE_OPTIONS.map(option => option.value));

/** Modes the same on every tab (worked out by the background, not by the pages). */
export const GLOBAL_BADGE_MODES = new Set<BadgeMode>(['reviews', 'lessons', 'next_reviews', 'next_time']);

type IconSettings = { extension_icon?: { kanji_counter?: boolean; badge?: string; badge_mode?: string } };

export function badgeModeOf(settings?: IconSettings): BadgeMode {
	const icon = settings?.extension_icon;
	if (icon?.badge && MODES.has(icon.badge as BadgeMode)) return icon.badge as BadgeMode;
	// before the choice existed: the counter on or off
	if (icon?.kanji_counter === false || icon?.badge_mode === 'none') return 'none';
	return 'subjects';
}

/** The pages send their highlighted subjects' count (the "Highlighted subjects" badge). */
export function isKanjiCounterEnabled(settings?: IconSettings): boolean {
	return badgeModeOf(settings) === 'subjects';
}

/** WaniKani's summary as last fetched: lessons, reviews available then, and those coming (time → count). */
export type BadgeSummary = { lessons: number; reviews: number; upcoming: Record<string, number>; fetchedAt: number };

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** "45m", "3h", "2d" (badges fit about 4 characters) */
function shortDuration(ms: number): string {
	const minutes = Math.max(1, Math.ceil(ms / 60_000));
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h`;
	return `${Math.round(hours / 24)}d`;
}

/**
 * A browser-wide badge from the summary, as of now: reviews that came since it was fetched
 * count as available (WaniKani makes them available on the hour). null: nothing to show.
 */
export function globalBadge(mode: BadgeMode, summary: BadgeSummary | null, now = Date.now()): { text: string; color: string; title: string } | null {
	if (!summary || !GLOBAL_BADGE_MODES.has(mode)) return null;
	let available = summary.reviews;
	const later: Array<[number, number]> = [];
	for (const [at, count] of Object.entries(summary.upcoming ?? {})) {
		const time = Date.parse(at);
		if (time <= now) available += count;
		else later.push([time, count]);
	}
	later.sort((a, b) => a[0] - b[0]);
	const next = later[0];
	switch (mode) {
		case 'reviews':
			return { text: formatBadgeCount(available), color: '#00aaff', title: `${plural(available, 'review')} available` };
		case 'lessons':
			return { text: formatBadgeCount(summary.lessons), color: WANIKANI_COLOR, title: `${plural(summary.lessons, 'lesson')} available` };
		case 'next_reviews':
			return next
				? { text: `+${next[1] > 99 ? '99' : next[1]}`, color: '#a100f1', title: `${plural(next[1], 'more review')} at ${new Date(next[0]).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` }
				: { text: '0', color: '#a100f1', title: 'No reviews coming in the next day' };
		case 'next_time':
			return next
				? { text: shortDuration(next[0] - now), color: '#6f3ff5', title: `Next reviews (${next[1]}) at ${new Date(next[0]).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` }
				: { text: '–', color: '#6f3ff5', title: 'No reviews coming in the next day' };
		default:
			return null;
	}
}

/** The page's level badges: per page (the page's JLPT level, or its Jōyō grade). */
export const PAGE_LEVEL_BADGE_MODES = new Set<BadgeMode>(['reading_level', 'reading_joyo']);

/** The page's level badge: its color (easier: greener), JLPT (N5–N1) or Jōyō (G1–G6, 中) as the bar's. */
export function readingLevelColor(level: string): string {
	return {
		N5: '#30a46c', N4: '#46a758', N3: '#e0a020', N2: '#f76808', N1: '#e5484d',
		G1: '#2f8f5b', G2: '#4f9a3a', G3: '#7a9e2a', G4: '#c48d0f', G5: '#d17a26', G6: '#d3602f', 中: '#c94040', '中+': '#8a2d2d',
	}[level] ?? '#8a3ffc';
}

export function getBadgeBackgroundColor(): string {
	return WANIKANI_COLOR;
}

export function getContrastTextColor(backgroundColor: string): '#000000' | '#ffffff' {
	const rgb = parseHexColor(backgroundColor);
	if (!rgb) return '#ffffff';

	const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
	return luminance > 0.62 ? '#000000' : '#ffffff';
}

/** A count for the badge: 0 shows (else it looks like it isn't working); below 0: nothing. */
export function formatBadgeCount(count: number): string {
	if (count < 0 || !Number.isFinite(count)) return '';
	return count > 999 ? '999' : String(count);
}

function parseHexColor(color: string): { r: number; g: number; b: number } | null {
	const hex = color.trim().replace(/^#/, '');
	if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;

	const normalized = hex.length === 3
		? hex.split('').map(char => char + char).join('')
		: hex;

	return {
		r: Number.parseInt(normalized.slice(0, 2), 16),
		g: Number.parseInt(normalized.slice(2, 4), 16),
		b: Number.parseInt(normalized.slice(4, 6), 16),
	};
}
