import { storage } from '#imports';
import { DEFAULT_PROXY } from '@/lib/proxy';
import { isBackgroundContext } from './wanikaniPages';
import { addNotifications } from './notifications';

/**
 * Friends: other WaniKani users' public profiles (www.wanikani.com/users/<name>), which the
 * API doesn't have. Read by the background script (directly; the CORS proxy is a fallback),
 * one friend at a time: once a day in the background, and when the list is opened (at most
 * every few minutes). The last result is kept, so the list shows instantly.
 */

const STORAGE_KEY = 'local:friends';
export const MAX_FRIENDS = 15;
/** background refresh (piggybacks on the hourly alarm) */
export const DAILY_REFRESH_MS = 24 * 60 * 60 * 1000;
/** opening the list refreshes it at most this often */
export const OPEN_REFRESH_MS = 15 * 60 * 1000;
/** pause between two profiles: never a burst of requests to WaniKani */
const SPACING_MS = 1500;
/** how long "leveled up" shows on a friend's row */
export const LEVEL_UP_SHOWN_MS = 14 * 24 * 60 * 60 * 1000;
/** hibernating friends: their page says nothing more until they're back, check rarely */
export const HIBERNATING_RECHECK_MS = 3 * 24 * 60 * 60 * 1000;

export type SrsCounts = { apprentice: number; guru: number; master: number; enlightened: number; burned: number };

export type FriendProfile = {
	username: string;
	level: number;
	/** WaniKani's title for the level range (Apprentice, Guru, …) */
	stage: string;
	startedAt: string | null;
	avatar: string | null;
	srs: SrsCounts;
	kanjiPercent: number | null;
	vocabularyPercent: number | null;
};

export type Friend = {
	/** as the user typed it (WaniKani's URLs ignore case) */
	username: string;
	profile: FriendProfile | null;
	fetchedAt: number;
	/** the last check failed: shown as such, the previous profile is kept */
	error: 'not_found' | 'unreachable' | null;
	/** level-ups noticed between two checks (so within a day of the real one) */
	levelUpAt: number | null;
	levelUpFrom: number | null;
	/** the popup showed the level-up toast for it */
	levelUpAnnounced?: boolean;
	/** hibernating on WaniKani (the profile then shows nothing): the last profile is kept */
	hibernating?: boolean;
	/** when going into / coming back from hibernation was noticed */
	hibernationChangedAt?: number | null;
	/** the popup showed the toast for that change */
	hibernationAnnounced?: boolean;
};

export type FriendsState = {
	version: 1;
	friends: Friend[];
	/** when the last check ended */
	refreshedAt: number;
	refreshing: boolean;
	refreshStartedAt?: number;
};

const keyOf = (username: string) => username.trim().toLowerCase();

function emptyState(): FriendsState {
	return { version: 1, friends: [], refreshedAt: 0, refreshing: false };
}

export async function readFriends(): Promise<FriendsState> {
	const saved = await storage.getItem<FriendsState>(STORAGE_KEY);
	return saved?.version === 1 ? saved : emptyState();
}

async function saveFriends(state: FriendsState): Promise<void> {
	await storage.setItem(STORAGE_KEY, state);
}

export function watchFriends(callback: (state: FriendsState) => void): () => void {
	return storage.watch<FriendsState>(STORAGE_KEY, state => callback(state?.version === 1 ? state : emptyState()));
}

/**
 * A backup's friends, added to the list (the ones already in it stay as they are), up to
 * MAX_FRIENDS. Their profiles are the backup's until the next check.
 */
export async function importFriends(imported: Friend[]): Promise<number> {
	const state = await readFriends();
	const known = new Set(state.friends.map(friend => keyOf(friend.username)));
	let added = 0;
	for (const friend of imported) {
		if (typeof friend?.username !== 'string' || !friend.username.trim()) continue;
		if (state.friends.length >= MAX_FRIENDS) break;
		const key = keyOf(friend.username);
		if (known.has(key)) continue;
		known.add(key);
		// nothing to announce: the toasts were for the other browser
		state.friends.push({ ...friend, levelUpAnnounced: true, hibernationAnnounced: true });
		added++;
	}
	if (added) await saveFriends(state);
	return added;
}

/** Another account (or logged out): its friends aren't ours. */
export async function clearFriends(): Promise<void> {
	await storage.removeItem(STORAGE_KEY);
}

/* ------------------------------------------------------------------ */
/* Reading a profile page (background script: no DOMParser there)     */
/* ------------------------------------------------------------------ */

function textOf(html: string, className: string): string | null {
	const match = html.match(new RegExp(`class="${className}"[^>]*>([^<]*)<`));
	return match ? match[1].trim() : null;
}

function percentAfter(html: string, title: string): number | null {
	const index = html.indexOf(`>${title}<`);
	if (index < 0) return null;
	const value = html.slice(index, index + 1500).match(/progress-bar-label-count">(\d+)%/)?.[1];
	return value != null ? Number(value) : null;
}

export function parseProfile(html: string): Omit<FriendProfile, 'avatar'> & { avatarUrl: string | null } | null {
	const username = textOf(html, 'public-profile__username');
	const levelText = textOf(html, 'public-profile__level-info-level');
	const level = Number(levelText?.match(/(\d+)/)?.[1]);
	if (!username || !Number.isFinite(level)) return null;

	const srs: SrsCounts = { apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0 };
	for (const match of html.matchAll(/item-spread-table-row__title">([^<]+)<[\s\S]*?item-spread-table-row__total">([\d,]+)</g)) {
		const stage = match[1].trim().toLowerCase() as keyof SrsCounts;
		if (stage in srs) srs[stage] = Number(match[2].replace(/,/g, ''));
	}

	const avatarTag = html.match(/<(?:wk-profile-image|img)\b[^>]*class="[^"]*user-avatar[^"]*"[^>]*>/i)?.[0] ?? '';
	const avatarUrl = avatarTag.match(/data-load-gravatar-url-value="([^"]+)"/)?.[1]
		?? avatarTag.match(/\ssrc="([^"]+)"/)?.[1]
		?? null;

	const sinceBlock = html.slice(html.indexOf('public-profile__serving-since'));
	return {
		username,
		level,
		stage: textOf(html, 'public-profile__level-info-stage') ?? '',
		startedAt: sinceBlock.match(/<time datetime="([^"]+)"/)?.[1] ?? null,
		avatarUrl: avatarUrl ? avatarUrl.replace(/&amp;/g, '&') : null,
		srs,
		kanjiPercent: percentAfter(html, 'Kanji Progression'),
		vocabularyPercent: percentAfter(html, 'Vocabulary Progression'),
	};
}

async function proxied(url: string): Promise<string> {
	const proxy = (await storage.getItem<string>('sync:proxyServer')) || DEFAULT_PROXY;
	return `${proxy.replace(/\/$/, '')}/${url}`;
}

/** A URL's response, directly, else through the proxy; null when neither answered. */
async function fetchDirectOrProxy(url: string): Promise<Response | null> {
	try {
		return await fetch(url, { credentials: 'omit' });
	} catch {
		// no access to the site: try the proxy
	}
	try {
		return await fetch(await proxied(url));
	} catch {
		return null;
	}
}

async function imageAsDataUrl(url: string): Promise<string | null> {
	const response = await fetchDirectOrProxy(url);
	if (!response?.ok) return null;
	const type = response.headers.get('content-type')?.split(';')[0] || 'image/png';
	const bytes = new Uint8Array(await response.arrayBuffer());
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return `data:${type};base64,${btoa(binary)}`;
}

type FetchResult =
	| { status: 'ok'; profile: FriendProfile }
	| { status: 'hibernating' }
	| { status: 'not_found' }
	| { status: 'unreachable' };

async function fetchProfile(username: string, previousAvatar: string | null): Promise<FetchResult> {
	const response = await fetchDirectOrProxy(`https://www.wanikani.com/users/${encodeURIComponent(username.trim())}`);
	if (!response) return { status: 'unreachable' };
	// a missing user isn't a 404: WaniKani redirects to its home page (the proxy names the final URL)
	const finalUrl = response.headers.get('x-final-url') || response.url;
	if (response.status === 404 || (response.ok && !/\/users\//.test(finalUrl))) return { status: 'not_found' };
	if (!response.ok) return { status: 'unreachable' };
	const html = await response.text();
	// "This user is hibernating.": no level or stats until they're back
	if (/id=['"]hibernation-page['"]/.test(html)) return { status: 'hibernating' };
	const parsed = parseProfile(html);
	// WaniKani answered, but not with a profile (a redesign, a login wall…)
	if (!parsed) return { status: 'unreachable' };
	const { avatarUrl, ...profile } = parsed;
	const avatar = avatarUrl ? (await imageAsDataUrl(avatarUrl).catch(() => null)) ?? previousAvatar : null;
	return { status: 'ok', profile: { ...profile, avatar } };
}

function applyResult(friend: Friend, result: FetchResult, now: number): Friend {
	if (result.status === 'hibernating') {
		// went into hibernation: keep their last profile, say so once
		if (friend.hibernating) return { ...friend, error: null, fetchedAt: now };
		return { ...friend, error: null, fetchedAt: now, hibernating: true, hibernationChangedAt: now, hibernationAnnounced: false };
	}
	if (result.status !== 'ok') return { ...friend, error: result.status, fetchedAt: now };
	const previousLevel = friend.profile?.level;
	const leveledUp = previousLevel != null && result.profile.level > previousLevel;
	const backFromHibernation = Boolean(friend.hibernating);
	return {
		...friend,
		profile: result.profile,
		fetchedAt: now,
		error: null,
		levelUpAt: leveledUp ? now : friend.levelUpAt,
		levelUpFrom: leveledUp ? previousLevel : friend.levelUpFrom,
		levelUpAnnounced: leveledUp ? false : friend.levelUpAnnounced,
		hibernating: false,
		hibernationChangedAt: backFromHibernation ? now : friend.hibernationChangedAt ?? null,
		hibernationAnnounced: backFromHibernation ? false : friend.hibernationAnnounced,
	};
}

/** What a check found, for the notifications history (the toast has its own flags). */
function eventNotifications(before: Friend, after: Friend): Parameters<typeof addNotifications>[0] {
	const name = after.profile?.username || after.username;
	const route = { name: 'Friends' };
	const entries: Parameters<typeof addNotifications>[0] = [];
	if (after.levelUpAt && after.levelUpAt !== before.levelUpAt) {
		entries.push({
			kind: 'friend_level_up',
			title: `${name} reached level ${after.profile?.level}`,
			text: `Up from level ${after.levelUpFrom}.`,
			username: name,
			route,
		});
	}
	if (after.hibernationChangedAt && after.hibernationChangedAt !== before.hibernationChangedAt) {
		entries.push(after.hibernating
			? { kind: 'friend_hibernating', title: `${name} went into hibernation`, text: 'Their last stats stay on your Friends list.', username: name, route }
			: { kind: 'friend_back', title: `${name} is back from hibernation`, username: name, route });
	}
	return entries;
}

export type FriendEvent = {
	username: string;
	avatar: string | null;
	kind: 'level_up' | 'hibernating' | 'back';
	level?: number;
};

/**
 * What changed for friends since the popup last said so (for the toast): level-ups, going
 * into hibernation, coming back. Hibernation changes are newer news, so they come first.
 */
export function unannouncedEvents(state: FriendsState): FriendEvent[] {
	const events: FriendEvent[] = [];
	for (const friend of state.friends) {
		const base = { username: friend.profile?.username || friend.username, avatar: friend.profile?.avatar ?? null };
		if (friend.hibernationChangedAt && friend.hibernationAnnounced === false) {
			events.push({ ...base, kind: friend.hibernating ? 'hibernating' : 'back' });
		}
		if (friend.levelUpAt && friend.levelUpAnnounced === false && Date.now() - friend.levelUpAt < LEVEL_UP_SHOWN_MS) {
			events.push({ ...base, kind: 'level_up', level: friend.profile?.level });
		}
	}
	return events;
}

export async function markEventsAnnounced(): Promise<void> {
	const state = await readFriends();
	await saveFriends({
		...state,
		friends: state.friends.map(friend => ({
			...friend,
			levelUpAnnounced: friend.levelUpAt ? true : friend.levelUpAnnounced,
			hibernationAnnounced: friend.hibernationChangedAt ? true : friend.hibernationAnnounced,
		})),
	});
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ */
/* Background work                                                    */
/* ------------------------------------------------------------------ */

let refreshing: Promise<void> | null = null;

/** Check, one at a time, the friends whose last check is older than `minAge`. */
export function refreshFriends(minAge: number): Promise<void> {
	refreshing ??= runRefresh(minAge).finally(() => { refreshing = null; });
	return refreshing;
}

async function runRefresh(minAge: number): Promise<void> {
	const state = await readFriends();
	// per friend: one just added (or checked) isn't read again; hibernating ones much more rarely
	const due = state.friends.filter(friend =>
		Date.now() - friend.fetchedAt >= (friend.hibernating ? Math.max(minAge, HIBERNATING_RECHECK_MS) : minAge));
	if (!due.length) return;
	await saveFriends({ ...state, refreshing: true, refreshStartedAt: Date.now() });

	try {
		for (const [index, { username }] of due.entries()) {
			if (index) await sleep(SPACING_MS);
			const latest = await readFriends();
			const current = latest.friends.find(friend => keyOf(friend.username) === keyOf(username));
			// removed while we were busy
			if (!current) continue;
			const result = await fetchProfile(username, current.profile?.avatar ?? null);
			// re-read: the list may have changed during the request
			const afterFetch = await readFriends();
			let before: Friend | null = null;
			let after: Friend | null = null;
			afterFetch.friends = afterFetch.friends.map(friend => {
				if (keyOf(friend.username) !== keyOf(username)) return friend;
				before = friend;
				after = applyResult(friend, result, Date.now());
				return after;
			});
			await saveFriends(afterFetch);
			if (before && after) await addNotifications(eventNotifications(before, after));
		}
	} finally {
		await saveFriends({ ...(await readFriends()), refreshing: false, refreshedAt: Date.now() });
	}
}

export type AddFriendResult =
	| { ok: true }
	| { ok: false; reason: 'invalid' | 'duplicate' | 'limit' | 'not_found' | 'unreachable' | 'self' | 'hibernating' };

/**
 * Check that the profile exists, then add it (background). A hibernating user is only added
 * when asked to (`allowHibernating`, after the popup asked): their row stays disabled.
 */
export async function addFriend(username: string, ownUsername?: string, allowHibernating = false): Promise<AddFriendResult> {
	const name = username.trim();
	if (!/^[A-Za-z0-9_-]{1,40}$/.test(name)) return { ok: false, reason: 'invalid' };
	if (ownUsername && keyOf(name) === keyOf(ownUsername)) return { ok: false, reason: 'self' };
	const state = await readFriends();
	if (state.friends.some(friend => keyOf(friend.username) === keyOf(name))) return { ok: false, reason: 'duplicate' };
	if (state.friends.length >= MAX_FRIENDS) return { ok: false, reason: 'limit' };

	const result = await fetchProfile(name, null);
	if (result.status === 'hibernating' && !allowHibernating) return { ok: false, reason: 'hibernating' };
	if (result.status !== 'ok' && result.status !== 'hibernating') return { ok: false, reason: result.status };

	const latest = await readFriends();
	if (latest.friends.some(friend => keyOf(friend.username) === keyOf(name))) return { ok: true };
	const friend: Friend = result.status === 'ok'
		? {
			// WaniKani's spelling of the name
			username: result.profile.username || name,
			profile: result.profile,
			fetchedAt: Date.now(),
			error: null,
			levelUpAt: null,
			levelUpFrom: null,
		}
		: {
			username: name,
			profile: null,
			fetchedAt: Date.now(),
			error: null,
			levelUpAt: null,
			levelUpFrom: null,
			// no toast: the user just chose to add them like this
			hibernating: true,
			hibernationChangedAt: null,
		};
	await saveFriends({ ...latest, friends: [...latest.friends, friend], refreshedAt: Date.now() });
	return { ok: true };
}

export async function removeFriend(username: string): Promise<void> {
	const state = await readFriends();
	await saveFriends({ ...state, friends: state.friends.filter(friend => keyOf(friend.username) !== keyOf(username)) });
}

/* ------------------------------------------------------------------ */
/* From the popup: the background does the requests                   */
/* ------------------------------------------------------------------ */

export async function requestAddFriend(username: string, ownUsername?: string, allowHibernating = false): Promise<AddFriendResult> {
	if (isBackgroundContext()) return addFriend(username, ownUsername, allowHibernating);
	try {
		const result = await browser.runtime.sendMessage({ type: 'wkh:friends:add', username, ownUsername, allowHibernating });
		return result?.ok != null ? result : { ok: false, reason: 'unreachable' };
	} catch {
		return { ok: false, reason: 'unreachable' };
	}
}

/** Opening the list: refresh if the last one is older than a few minutes. */
export function requestRefreshFriends(minAge = OPEN_REFRESH_MS): void {
	if (isBackgroundContext()) {
		void refreshFriends(minAge);
		return;
	}
	try {
		void browser.runtime.sendMessage({ type: 'wkh:friends:refresh', minAge }).catch(() => {});
	} catch {
		/* the background will catch up on its daily refresh */
	}
}
