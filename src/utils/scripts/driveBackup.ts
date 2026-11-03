import { storage } from '#imports';
import { createBackup, readBackupChoice, readPendingRestore, type BackupApiKey, type BackupFile } from './backup';
import { fetchWaniKaniPage } from './wanikaniPages';

/**
 * Settings → Data → Backup → Google Drive: the backup (see backup.ts) in the user's own
 * Drive, in its hidden app folder (only this extension sees it, the scope can't reach anything
 * else). Each browser keeps its own last few backups, so two browsers never overwrite each
 * other; restoring picks one and goes through the same import as a file. Optionally once a
 * day, from the background.
 *
 * Sign-in: Chrome's own (getAuthToken, the Web Store copy), else Google's sign-in page in a
 * window (launchWebAuthFlow: Brave, Edge, other Chromium browsers, unpacked builds). Neither
 * needs a client secret; tokens last an hour and are asked again silently.
 */

/** OAuth client of type "Chrome extension" (the Web Store item) */
const CHROME_CLIENT_ID = '394034186676-emo8eoah6s4jel7vr3nmaq3lsusc6hrc.apps.googleusercontent.com';
/** OAuth client of type "Web application": redirect https://<extension id>.chromiumapp.org/ */
const WEB_CLIENT_ID = '394034186676-849pekhdpv2vuk77pbhocbjt98qvtqel.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

const STATE_KEY = 'local:driveBackup';
const DEVICE_KEY = 'local:backupDevice';
/** the profile picture, small (extension storage: the background's backups read it too) */
const AVATAR_KEY = 'local:backupAvatar';
/** "username:hash" of the picture last put in Drive (sent again only when it changes) */
const AVATAR_SENT_KEY = 'local:driveAvatarSent';
/** a picture in Drive: one file per WaniKani account, next to the backups */
const AVATAR_FILE_PREFIX = 'avatar-';
const AVATAR_SIZE = 64;
const TOKEN_KEY = 'session:driveToken';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
/** the automatic backup: at most this often */
const AUTO_EVERY_MS = 24 * 60 * 60 * 1000;
/** backups kept per browser (a week of daily ones) */
const KEEP_PER_BROWSER = 7;
/** a token this close to expiring is asked again */
const TOKEN_MARGIN_MS = 60 * 1000;

type SignInMethod = 'chrome' | 'web';

export type DriveBackupState = {
	connected: boolean;
	method: SignInMethod | null;
	/** the Google account, when Drive says */
	account: string | null;
	/** once a day, from the background */
	auto: boolean;
	lastBackupAt: number | null;
	/** the last automatic backup failed (shown in the settings) */
	lastError: string | null;
};

export type DriveBackupEntry = {
	id: string;
	device: string;
	deviceName: string;
	modifiedAt: number;
	size: number;
	/** this browser's own backup */
	mine: boolean;
	/** it holds the API key (the login screen can restore it) */
	hasKey: boolean;
	/** the WaniKani account, when the key is in it */
	username: string | null;
	/** that account's profile picture (a small data URL), when one was saved to Drive */
	avatar: string | null;
};

/** The profile picture, small, for the backups lists (kept by the popup: see saveBackupAvatar). */
type BackupAvatar = { username: string; image: string; hash: string };

type Device = { id: string; name: string };
type Token = { token: string; expiresAt: number; method: SignInMethod };

/** Signing in again is needed (an automatic backup can't open the sign-in window). */
export class DriveSignInNeeded extends Error {
	constructor() {
		super('Sign in to Google Drive again to keep backing up.');
	}
}

function emptyState(): DriveBackupState {
	return { connected: false, method: null, account: null, auto: true, lastBackupAt: null, lastError: null };
}

export async function readDriveBackupState(): Promise<DriveBackupState> {
	return { ...emptyState(), ...(await storage.getItem<DriveBackupState>(STATE_KEY)) };
}

async function updateState(patch: Partial<DriveBackupState>): Promise<DriveBackupState> {
	const state = { ...(await readDriveBackupState()), ...patch };
	await storage.setItem(STATE_KEY, state);
	return state;
}

export function watchDriveBackupState(callback: (state: DriveBackupState) => void): () => void {
	return storage.watch<DriveBackupState>(STATE_KEY, state => callback({ ...emptyState(), ...state }));
}

export async function setDriveAutoBackup(auto: boolean): Promise<void> {
	await updateState({ auto });
}

/* ------------------------------------------------------------------ */
/* This browser                                                        */
/* ------------------------------------------------------------------ */

/** "Brave · Windows": what the backup list calls this browser */
function browserName(): string {
	const data = (navigator as any).userAgentData;
	const brand = (data?.brands ?? [])
		.map((entry: { brand: string }) => entry.brand)
		.find((name: string) => !/not.?a.?brand|chromium/i.test(name));
	const ua = navigator.userAgent;
	const name = (navigator as any).brave ? 'Brave'
		: brand?.replace(/^Google /, '').replace(/^Microsoft /, '')
		?? (/Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : 'Browser');
	const platform = data?.platform || (/Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /Linux/.test(ua) ? 'Linux' : '');
	return platform ? `${name} · ${platform}` : name;
}

async function thisDevice(): Promise<Device> {
	const saved = await storage.getItem<Device>(DEVICE_KEY);
	if (saved?.id) return saved;
	const device = { id: crypto.randomUUID(), name: browserName() };
	await storage.setItem(DEVICE_KEY, device);
	return device;
}

/* ------------------------------------------------------------------ */
/* Signing in                                                          */
/* ------------------------------------------------------------------ */

const identity = () => (browser as any).identity;

/** Chrome's own sign-in (the Web Store copy in Chrome); null where it isn't available. */
async function chromeToken(interactive: boolean): Promise<Token | null> {
	// Brave and Edge have the call, but can't give a token
	if (!identity()?.getAuthToken || (navigator as any).brave) return null;
	try {
		const result = await identity().getAuthToken({ interactive, scopes: [SCOPE] });
		const token = typeof result === 'string' ? result : result?.token;
		// Chrome caches and refreshes it: ask again within the hour
		return token ? { token, expiresAt: Date.now() + 50 * 60 * 1000, method: 'chrome' } : null;
	} catch {
		return null;
	}
}

/** Google's sign-in page in a window (silent with interactive false, if still signed in). */
async function webToken(interactive: boolean): Promise<Token | null> {
	if (!identity()?.launchWebAuthFlow) return null;
	const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
	url.search = new URLSearchParams({
		client_id: WEB_CLIENT_ID,
		response_type: 'token',
		redirect_uri: identity().getRedirectURL(),
		scope: SCOPE,
		include_granted_scopes: 'true',
		prompt: interactive ? 'select_account' : 'none',
	}).toString();
	try {
		const redirect: string = await identity().launchWebAuthFlow({ url: url.toString(), interactive });
		const params = new URLSearchParams(new URL(redirect).hash.slice(1));
		const token = params.get('access_token');
		if (!token) return null;
		return { token, expiresAt: Date.now() + Number(params.get('expires_in') ?? 3600) * 1000, method: 'web' };
	} catch {
		return null;
	}
}

async function cachedToken(): Promise<Token | null> {
	const token = await storage.getItem<Token>(TOKEN_KEY);
	return token && token.expiresAt - TOKEN_MARGIN_MS > Date.now() ? token : null;
}

async function forgetToken(token?: Token | null): Promise<void> {
	await storage.removeItem(TOKEN_KEY);
	if (token?.method === 'chrome') await identity()?.removeCachedAuthToken?.({ token: token.token }).catch(() => {});
}

/** A token for Drive: the cached one, else asked silently; null if signing in is needed. */
async function getToken(): Promise<Token | null> {
	const cached = await cachedToken();
	if (cached) return cached;
	const { method } = await readDriveBackupState();
	const token = method === 'chrome' ? await chromeToken(false) : await webToken(false);
	if (token) await storage.setItem(TOKEN_KEY, token);
	return token;
}

/** Drive, signed in; one retry with a new token if it was refused. */
async function drive(url: string, init: RequestInit = {}): Promise<Response> {
	for (let attempt = 0; attempt < 2; attempt++) {
		const token = await getToken();
		if (!token) throw new DriveSignInNeeded();
		const response = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token.token}` } });
		if (response.status !== 401) {
			if (!response.ok) throw new Error(`Google Drive answered ${response.status}.`);
			return response;
		}
		await forgetToken(token);
	}
	throw new DriveSignInNeeded();
}

/** Whether this browser has a way to sign in to Google at all (Kiwi, for one, doesn't). */
export function driveSignInAvailable(): boolean {
	const api = identity();
	return Boolean(api?.launchWebAuthFlow || api?.getAuthToken);
}

/** Why the Drive buttons are greyed out (see driveSignInAvailable). */
export const DRIVE_UNAVAILABLE_NOTE = 'This browser can\'t sign in to Google from an extension, so Google Drive isn\'t available here. Use a backup file instead.';

/* ------------------------------------------------------------------ */
/* Logging in with Drive (the login screen)                             */
/* ------------------------------------------------------------------ */

/**
 * Signing in from the login screen runs in the background: in some browsers Google's window
 * closes the popup, which would end the sign-in with it. The backups found are kept (for the
 * browser session), so the popup opened again shows them.
 */
const LOGIN_KEY = 'session:driveLogin';
/** a sign-in still "under way" after this long was cut off (the background stopped) */
const LOGIN_STALE_MS = 5 * 60 * 1000;

export type DriveLoginState = {
	status: 'signing-in' | 'ready' | 'error';
	/** the backups holding an API key */
	entries: DriveBackupEntry[];
	error: string | null;
	at: number;
};

export async function readDriveLogin(): Promise<DriveLoginState | null> {
	const state = await storage.getItem<DriveLoginState>(LOGIN_KEY);
	if (state?.status === 'signing-in' && Date.now() - state.at > LOGIN_STALE_MS) return null;
	return state ?? null;
}

export function watchDriveLogin(callback: (state: DriveLoginState | null) => void): () => void {
	return storage.watch<DriveLoginState>(LOGIN_KEY, state => callback(state ?? null));
}

export async function clearDriveLogin(): Promise<void> {
	await storage.removeItem(LOGIN_KEY);
}

/** In the background (message wkh:driveLogin): sign in, then the backups that can log in. */
export async function runDriveLogin(): Promise<void> {
	const set = (patch: Omit<DriveLoginState, 'at'>) => storage.setItem(LOGIN_KEY, { ...patch, at: Date.now() });
	await set({ status: 'signing-in', entries: [], error: null });
	try {
		await connectDrive();
		const entries = (await listDriveBackups()).filter(entry => entry.hasKey);
		await set({ status: 'ready', entries, error: null });
	} catch (error: any) {
		await set({ status: 'error', entries: [], error: error?.message || 'Google Drive didn\'t answer. Try again in a moment.' });
	}
}

/** Signing in (opens Google's window): Chrome's own sign-in first, else the web page. */
export async function connectDrive(): Promise<DriveBackupState> {
	const token = await chromeToken(true) ?? await webToken(true);
	if (!token) throw new Error('Signing in to Google didn\'t finish.');
	await storage.setItem(TOKEN_KEY, token);
	await updateState({ connected: true, method: token.method, lastError: null });
	// which account (only shown: nothing depends on it)
	const about = await drive(`${DRIVE}/about?fields=user(emailAddress,displayName)`).then(r => r.json()).catch(() => null);
	await updateState({ account: about?.user?.emailAddress ?? about?.user?.displayName ?? null });
	// this browser's backups already there: its last one is known (listing notes it)
	await listDriveBackups({ avatars: false }).catch(() => null);
	return readDriveBackupState();
}

/** Signs out here; the backups stay in Drive (Google's account settings can remove them). */
export async function disconnectDrive(): Promise<void> {
	const token = await cachedToken();
	if (token) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token.token)}`, { method: 'POST' }).catch(() => {});
	await forgetToken(token);
	await storage.setItem(STATE_KEY, { ...emptyState() });
}

/* ------------------------------------------------------------------ */
/* Backups                                                             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Profile pictures (for the lists: several WaniKani accounts can share a Drive) */
/* ------------------------------------------------------------------ */

/** A short fingerprint of the picture (to know when it changed). */
function hashText(text: string): string {
	let hash = 5381;
	for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
	return `${text.length}-${(hash >>> 0).toString(36)}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

/** small enough to keep as it is, when it can't be shrunk */
const AVATAR_MAX_KEPT = 48 * 1024;

/**
 * A picture (data URL or web address) as a small data URL; works in the background too.
 * WaniKani's avatars are SVGs: kept as they are (small, and sharp at any size).
 */
async function shrinkImage(src: string): Promise<string | null> {
	try {
		const blob = await (await fetch(src)).blob();
		if (!blob.type.startsWith('image/')) return null;
		const asIs = () => (blob.size <= AVATAR_MAX_KEPT ? blobToDataUrl(blob) : null);
		if (blob.type === 'image/svg+xml') return asIs();
		if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') return asIs();
		const bitmap = await createImageBitmap(blob).catch(() => null);
		if (!bitmap) return asIs();
		const side = Math.min(bitmap.width, bitmap.height);
		const canvas = new OffscreenCanvas(AVATAR_SIZE, AVATAR_SIZE);
		const ctx = canvas.getContext('2d');
		if (!ctx || !side) return null;
		// the middle square, as the round avatars show it
		ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
		return blobToDataUrl(await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 }));
	} catch {
		return null;
	}
}

/** From the popup (it has the picture): the user's profile picture, small, for the next Drive backups. */
export async function saveBackupAvatar(username: string | null | undefined, avatar: string | null | undefined): Promise<void> {
	if (!username || !avatar) return;
	const image = await shrinkImage(avatar);
	if (!image) return;
	const saved = await storage.getItem<BackupAvatar>(AVATAR_KEY);
	const hash = hashText(image);
	if (saved?.username === username && saved.hash === hash) return;
	await storage.setItem(AVATAR_KEY, { username, image, hash } satisfies BackupAvatar);
}

/** The account's picture file in Drive: created, or updated when the picture changed. */
async function syncDriveAvatar(username: string): Promise<void> {
	const avatar = await storage.getItem<BackupAvatar>(AVATAR_KEY);
	if (!avatar || avatar.username !== username) return;
	const sent = `${username}:${avatar.hash}`;
	if (await storage.getItem<string>(AVATAR_SENT_KEY) === sent) return;

	const name = `${AVATAR_FILE_PREFIX}${username}.json`;
	const params = new URLSearchParams({
		spaces: 'appDataFolder',
		q: `name = '${name.replace(/['\\]/g, '\\$&')}'`,
		fields: 'files(id)',
	});
	const { files = [] } = await (await drive(`${DRIVE}/files?${params}`)).json();
	const content = JSON.stringify({ username, image: avatar.image });
	if (files[0]?.id) {
		await drive(`${UPLOAD}/files/${encodeURIComponent(files[0].id)}?uploadType=media`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: content,
		});
	} else {
		const boundary = `wkh-${crypto.randomUUID()}`;
		const metadata = { name, mimeType: 'application/json', parents: ['appDataFolder'], appProperties: { kind: 'avatar', username } };
		await drive(`${UPLOAD}/files?uploadType=multipart`, {
			method: 'POST',
			headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
			body: [`--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', JSON.stringify(metadata),
				`--${boundary}`, 'Content-Type: application/json', '', content, `--${boundary}--`].join('\r\n'),
		});
	}
	await storage.setItem(AVATAR_SENT_KEY, sent);
}

const isAvatarFile = (file: any) => file.appProperties?.kind === 'avatar' || String(file.name ?? '').startsWith(AVATAR_FILE_PREFIX);

/** username → picture, for the accounts listed (one small download each). */
async function readDriveAvatars(avatarFiles: any[], usernames: Set<string>): Promise<Map<string, string>> {
	const pictures = new Map<string, string>();
	await Promise.all(avatarFiles
		.filter(file => usernames.has(file.appProperties?.username))
		.map(async file => {
			try {
				const data = await (await drive(`${DRIVE}/files/${encodeURIComponent(file.id)}?alt=media`)).json();
				if (typeof data?.image === 'string' && data.image.startsWith('data:image/')) pictures.set(file.appProperties.username, data.image);
			} catch {
				// only a picture: the list shows the default one
			}
		}));
	return pictures;
}

/** Pictures read from WaniKani profiles (accounts with none in Drive): username → picture, kept here. */
const WEB_AVATARS_KEY = 'local:webAvatars';
/** a profile with no picture found: tried again after this long */
const WEB_AVATAR_RETRY_MS = 7 * 24 * 60 * 60 * 1000;

type WebAvatars = Record<string, { image: string | null; at: number }>;

/** The avatar's address on a public profile page (as the API manager's _extractAvatarUrlFromHtml). */
function avatarUrlFromProfile(html: string): string | null {
	const tag = html.match(/<(?:img|wk-profile-image)\b[^>]*class="[^"]*user-avatar[^"]*"[^>]*>/i)?.[0];
	if (!tag) return null;
	for (const attr of ['data-load-gravatar-url-value', 'src', 'data-src']) {
		const value = tag.match(new RegExp(`${attr}="([^"]+)"`, 'i'))?.[1];
		if (value) return new URL(value.replace(/&amp;/g, '&'), 'https://www.wanikani.com/').toString();
	}
	return null;
}

/**
 * Accounts Drive has no picture for (backups from before pictures were saved, or made in a
 * browser that never had it): their public WaniKani profile's, read once and kept here.
 */
async function readWebAvatars(usernames: string[]): Promise<Map<string, string>> {
	const pictures = new Map<string, string>();
	if (!usernames.length) return pictures;
	const cache = (await storage.getItem<WebAvatars>(WEB_AVATARS_KEY)) ?? {};
	let changed = false;
	await Promise.all(usernames.map(async username => {
		const cached = cache[username];
		if (cached?.image) return pictures.set(username, cached.image);
		if (cached && Date.now() - cached.at < WEB_AVATAR_RETRY_MS) return;
		const html = await fetchWaniKaniPage(`https://www.wanikani.com/users/${encodeURIComponent(username)}`);
		const url = html ? avatarUrlFromProfile(html) : null;
		const image = url ? await shrinkImage(url) : null;
		cache[username] = { image, at: Date.now() };
		changed = true;
		if (image) pictures.set(username, image);
	}));
	if (changed) await storage.setItem(WEB_AVATARS_KEY, cache);
	return pictures;
}

/** Every browser's backup, newest first (with the accounts' pictures, unless not needed). */
export async function listDriveBackups({ avatars = true } = {}): Promise<DriveBackupEntry[]> {
	const device = await thisDevice();
	const params = new URLSearchParams({
		spaces: 'appDataFolder',
		fields: 'files(id,name,modifiedTime,size,appProperties)',
		pageSize: '100',
		orderBy: 'modifiedTime desc',
	});
	const { files = [] } = await (await drive(`${DRIVE}/files?${params}`)).json();
	const backups = files.filter((file: any) => !isAvatarFile(file));
	const usernames = new Set<string>(backups.map((file: any) => file.appProperties?.username).filter(Boolean));
	const pictures = avatars && usernames.size
		? await readDriveAvatars(files.filter(isAvatarFile), usernames)
		: new Map<string, string>();
	// none in Drive for some: from their WaniKani profile (once, then kept here)
	if (avatars) {
		const missing = [...usernames].filter(username => !pictures.has(username));
		for (const [username, image] of await readWebAvatars(missing).catch(() => new Map<string, string>())) pictures.set(username, image);
	}
	const entries: DriveBackupEntry[] = backups.map((file: any) => ({
		id: file.id,
		device: file.appProperties?.device ?? '',
		deviceName: file.appProperties?.deviceName ?? file.name,
		modifiedAt: Date.parse(file.modifiedTime) || 0,
		size: Number(file.size) || 0,
		mine: file.appProperties?.device === device.id,
		hasKey: file.appProperties?.hasKey === '1',
		username: file.appProperties?.username || null,
		avatar: pictures.get(file.appProperties?.username) ?? null,
	}));
	// signed in again (logged out and in, the login screen's restore): this browser's last
	// backup is known from Drive, not "none yet"
	const newestMine = entries.find(entry => entry.mine)?.modifiedAt;
	const state = await readDriveBackupState();
	if (newestMine && state.connected && (state.lastBackupAt ?? 0) < newestMine) await updateState({ lastBackupAt: newestMine });
	return entries;
}

/** Removes a backup from Drive (for good: Drive's app folder has no trash). */
export async function deleteDriveBackup(id: string): Promise<void> {
	await drive(`${DRIVE}/files/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function downloadDriveBackup(id: string): Promise<string> {
	return (await drive(`${DRIVE}/files/${encodeURIComponent(id)}?alt=media`)).text();
}

/**
 * A new backup of this browser (the parts chosen in the settings). Each one is a new file and
 * the last few are kept: a backup made after something went wrong never replaces the good one.
 */
export async function backUpToDrive(): Promise<DriveBackupState> {
	const [device, parts] = await Promise.all([thisDevice(), readBackupChoice()]);
	const backup: BackupFile = await createBackup(parts, 'drive');
	const apiKey = backup.parts.apiKey as BackupApiKey | undefined;

	const boundary = `wkh-${crypto.randomUUID()}`;
	const metadata = {
		name: `backup-${device.id}-${Date.now()}.json`,
		mimeType: 'application/json',
		parents: ['appDataFolder'],
		// listed without downloading each one (the login screen shows whose key it is)
		appProperties: {
			device: device.id,
			deviceName: device.name,
			...(apiKey ? { hasKey: '1', username: apiKey.username ?? '' } : {}),
		},
	};
	const body = [
		`--${boundary}`,
		'Content-Type: application/json; charset=UTF-8',
		'',
		JSON.stringify(metadata),
		`--${boundary}`,
		'Content-Type: application/json',
		'',
		JSON.stringify(backup),
		`--${boundary}--`,
	].join('\r\n');

	await drive(`${UPLOAD}/files?uploadType=multipart`, {
		method: 'POST',
		headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
		body,
	});
	const state = await updateState({ lastBackupAt: Date.now(), lastError: null });

	// whose key it is: their picture too, for the lists (only a picture: never fails the backup)
	if (apiKey?.username) await syncDriveAvatar(apiKey.username).catch(() => {});

	// this browser's older ones, past the last few (the list is newest first)
	const older = (await listDriveBackups({ avatars: false })).filter(entry => entry.mine).slice(KEEP_PER_BROWSER);
	for (const entry of older) {
		await drive(`${DRIVE}/files/${encodeURIComponent(entry.id)}`, { method: 'DELETE' }).catch(() => {});
	}
	return state;
}

/** From the hourly alarm: the daily backup, when it's due (never opens a window). */
export async function autoBackUpToDrive(): Promise<void> {
	const state = await readDriveBackupState();
	if (!state.connected || !state.auto) return;
	if (state.lastBackupAt && Date.now() - state.lastBackupAt < AUTO_EVERY_MS) return;
	// logged in from a Drive backup that isn't imported yet: this browser's data isn't the real one
	if (await readPendingRestore()) return;
	try {
		await backUpToDrive();
	} catch (error) {
		await updateState({ lastError: error instanceof DriveSignInNeeded ? error.message : 'The last automatic backup failed. It will be tried again.' });
	}
}
