<template>
	<div>
		<div class="logo-container">
			<img :src="logo" alt="Logo" />
			<span>Wanikani Kanji Highlighter</span>
		</div>
		<form @submit.prevent="login">
			<div class="input-container">
				<input
					v-model="apiKey"
					id="apiKey"
					placeholder="Enter Wanikani API Key"
					type="text"
					autocomplete="off"
					spellcheck="false"
					:disabled="validating"
					required
				/>
			</div>
			<p v-if="errorMessage" class="login-error">{{ errorMessage }}</p>
			<p v-else-if="successMessage" class="login-success">{{ successMessage }}</p>
			<p v-else-if="keyFromPage" class="login-success">Key received from WaniKani: just click Login.</p>
			<!-- the two ways in, together: the key, or a Google Drive backup holding it -->
			<div class="login-actions">
				<button type="submit" :disabled="validating || Boolean(driveStep)">
					{{ validating ? 'Checking…' : 'Login' }}
				</button>
				<span class="login-or">or</span>
				<button
					v-if="!driveEntries"
					type="button"
					class="login-drive-button"
					:disabled="validating || Boolean(driveStep) || !driveAvailable"
					:title="driveAvailable ? '' : DRIVE_UNAVAILABLE_LOGIN"
					@click="openDrive"
				>
					<!-- Google Drive's logo -->
					<svg class="login-drive-logo" viewBox="0 0 87.3 78" aria-hidden="true">
						<path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
						<path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
						<path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
						<path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
						<path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
						<path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
					</svg>
					{{ driveStep === 'connect' ? 'Signing in to Google…' : 'Log in with Google Drive' }}
				</button>

				<!-- the backups found: in a box saying where they come from (Drive, which account) -->
				<section v-else class="login-drive-box" aria-label="Google Drive backups">
					<header class="login-drive-box-head">
						<svg class="login-drive-logo" viewBox="0 0 87.3 78" aria-hidden="true">
							<path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
							<path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
							<path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
							<path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
							<path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
							<path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
						</svg>
						<span class="login-drive-box-title">
							<b>Google Drive backups</b>
							<span v-if="driveAccount">{{ driveAccount }}</span>
						</span>
					</header>
					<p class="login-drive-box-hint">
						{{ driveEntries.length ? 'Choose one to log in with its API key:' : '' }}
					</p>
					<p v-if="!driveEntries.length" class="login-error">
						No backup in this Google Drive holds an API key. Log in with your key above: the rest can
						be restored from Settings → Data → Backup.
					</p>
					<button
						v-for="entry in driveEntries"
						:key="entry.id"
						type="button"
						class="login-drive-entry"
						:disabled="Boolean(driveStep)"
						@click="restoreFrom(entry)"
					>
						<!-- whose account (one Drive can hold several): the picture, then the name -->
						<img class="login-drive-avatar" :src="entry.avatar || defaultAvatar" alt="" />
						<span class="login-drive-entry-text">
							<b>{{ entry.username || 'WaniKani account' }}</b>
							<span>{{ entry.deviceName }} · {{ formatDate(entry.modifiedAt) }}</span>
						</span>
					</button>
					<button type="button" class="login-drive-cancel" :disabled="Boolean(driveStep)" @click="cancelDrive">
						Cancel
					</button>
				</section>
				<p v-if="driveError" class="login-error">{{ driveError }}</p>
			</div>

			<div class="bottom">
				<a href="https://www.wanikani.com/settings/personal_access_tokens" target="_blank">Find API Key</a>
				<!-- kept from before (logging out keeps WaniKani's content): not downloaded again -->
				<p v-if="downloaded" class="login-downloaded">
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C7.6 3 4 4.6 4 6.5v11C4 19.4 7.6 21 12 21s8-1.6 8-3.5v-11C20 4.6 16.4 3 12 3zm0 2c3.7 0 6 1.2 6 1.5S15.7 8 12 8 6 6.8 6 6.5 8.3 5 12 5zm6 12.5c0 .3-2.3 1.5-6 1.5s-6-1.2-6-1.5v-2.3c1.5.8 3.6 1.3 6 1.3s4.5-.5 6-1.3v2.3zm0-5c0 .3-2.3 1.5-6 1.5s-6-1.2-6-1.5V9.2c1.5.8 3.6 1.3 6 1.3s4.5-.5 6-1.3v3.3z" /></svg>
					<span>
						<b>{{ downloaded.subjects.toLocaleString() }}</b> subjects already downloaded<template v-if="downloaded.size"> ({{ downloaded.size }})</template>:
						logging in only fetches your progress.
					</span>
					<button type="button" class="login-downloaded-clear" :disabled="clearing" title="Delete the downloaded subjects (your settings stay)" @click="clearDownloaded">
						{{ clearing ? 'Clearing…' : 'Clear' }}
					</button>
				</p>
				<p v-else-if="clearedNote" class="login-downloaded cleared">{{ clearedNote }}</p>
				<span class="login-hint">
					The extension only reads your WaniKani data: a key <b>without write permissions</b>
					(WaniKani's default when creating one) is all it needs.
				</span>
				<span v-if="!driveEntries && !driveAvailable" class="login-hint">
					{{ DRIVE_UNAVAILABLE_LOGIN }}
				</span>
				<span v-else-if="!driveEntries" class="login-hint">
					<b>Log in with Google Drive</b> works if you backed up your API key there (Settings →
					Data → Backup): you're logged in with it and can restore the rest.
				</span>
			</div>
			<span class="version">v{{ version }}</span>
		</form>
	</div>
</template>

<script>
import { ref } from "vue";
import { DEFAULT_PROXY } from '@/lib/apiClient';
import { normalizeApiKey, validateApiKey } from '@/utils/scripts/apiKeyValidation';
import { readPendingApiKey } from '@/utils/scripts/pendingApiKey';
import { parseBackup, readPendingRestore, savePendingRestore } from '@/utils/scripts/backup';
import { browser } from 'wxt/browser';
import { storage } from '#imports';
import {
	clearDriveLogin,
	downloadDriveBackup,
	driveSignInAvailable,
	readDriveBackupState,
	readDriveLogin,
	watchDriveLogin,
} from '@/utils/scripts/driveBackup';

const DRIVE_UNAVAILABLE_LOGIN = 'Logging in with Google Drive isn\'t available in this browser: it can\'t sign in to Google from an extension. Log in with your API key.';

import logo from '@/assets/logo.png';
import defaultAvatar from '@/assets/wanikani-default.png';

export default {
	emits: ['login'],

	data() {
		return {
			apiKey: '',
			proxyServer: DEFAULT_PROXY,
			version: ref(chrome.runtime.getManifest().version),
			logo,
			defaultAvatar,
			validating: false,
			errorMessage: '',
			successMessage: '',
			/** the key was sent from WaniKani's tokens page (see utils/highlight/apiKeyHandoff.ts) */
			keyFromPage: false,
			/** Log in with Google Drive: 'connect' | 'restore' | '' */
			driveStep: '',
			/** this browser has a way to sign in to Google (Kiwi doesn't) */
			driveAvailable: driveSignInAvailable(),
			DRIVE_UNAVAILABLE_LOGIN,
			/** the Drive backups holding an API key, while choosing one */
			driveEntries: null,
			driveError: '',
			/** the Google account the backups are in (its email) */
			driveAccount: null,
			/** subjects kept from before: { subjects, size } (null: none) */
			downloaded: null,
			clearing: false,
			clearedNote: '',
		};
	},

	async created() {
		const pending = await readPendingApiKey();
		if (pending && !this.apiKey) {
			this.apiKey = pending;
			this.keyFromPage = true;
		}
	},

	async mounted() {
		document.body.style.paddingRight = "unset";
		document.body.style.minHeight = "unset";
		document.body.style.marginTop = "unset";
		// a Drive sign-in started before (maybe in a popup that closed): where it got to
		this.stopDriveWatch = watchDriveLogin(state => this.applyDriveLogin(state));
		this.applyDriveLogin(await readDriveLogin());
		void this.readDownloaded();
	},

	beforeUnmount() {
		this.stopDriveWatch?.();
		document.body.style.paddingRight = null;
		document.body.style.minHeight = null;
		document.body.style.marginTop = null;
	},

	methods: {
		async login() {
			this.errorMessage = '';
			this.successMessage = '';
			this.validating = true;

			try {
				const result = await validateApiKey(this.apiKey);
				if (!result.ok) {
					this.errorMessage = result.error;
					return;
				}

				this.successMessage = `Welcome, ${result.username}!`;
				// a Drive backup chosen before (its key no longer worked): its import step, once in
				if (await readPendingRestore()) {
					await this.$router.replace({ name: 'Settings', query: { tab: 'data', section: 'backup' } });
				}
				this.$emit('login', normalizeApiKey(this.apiKey), this.proxyServer);
			} finally {
				this.validating = false;
			}
		},

		formatDate(value) {
			return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
		},

		/**
		 * Google sign-in, then the backups that can log in (they hold the API key). Runs in the
		 * background (see runDriveLogin): its progress and result come back through applyDriveLogin,
		 * also when the popup was closed meanwhile and opened again.
		 */
		async openDrive() {
			this.driveError = '';
			this.errorMessage = '';
			this.driveStep = 'connect';
			try {
				await browser.runtime.sendMessage({ type: 'wkh:driveLogin' });
			} catch {
				this.driveStep = '';
				this.driveError = 'Google Drive didn\'t answer. Try again in a moment.';
			}
		},

		applyDriveLogin(state) {
			// choosing a backup (or its download): that step's own state
			if (this.driveStep === 'restore') return;
			this.driveStep = state?.status === 'signing-in' ? 'connect' : '';
			this.driveEntries = state?.status === 'ready' ? state.entries : null;
			this.driveError = state?.status === 'error' ? state.error : '';
			// which Google account they're in (the box's title)
			if (state?.status === 'ready') void readDriveBackupState().then(drive => { this.driveAccount = drive.account; });
		},

		/**
		 * The subjects kept from before (the API manager's database, read directly: there's no
		 * manager without a key) and the space the extension uses (the browser's estimate).
		 */
		async readDownloaded() {
			const DB = 'WaniKaniAPIManager';
			try {
				// don't create the database by opening it
				if (indexedDB.databases && !(await indexedDB.databases()).some(db => db.name === DB)) return;
				const subjects = await new Promise((resolve) => {
					const request = indexedDB.open(DB);
					request.onerror = () => resolve(0);
					request.onsuccess = () => {
						const db = request.result;
						if (!db.objectStoreNames.contains('materials')) {
							db.close();
							return resolve(0);
						}
						const count = db.transaction('materials', 'readonly').objectStore('materials').count();
						count.onsuccess = () => { resolve(count.result); db.close(); };
						count.onerror = () => { resolve(0); db.close(); };
					};
				});
				if (!subjects) return;
				const usage = (await navigator.storage?.estimate?.())?.usage ?? 0;
				const size = usage ? `${(usage / (1024 * 1024)).toFixed(usage < 10 * 1024 * 1024 ? 1 : 0)} MB` : '';
				this.downloaded = { subjects, size };
			} catch {
				// only a note: nothing shown
			}
		},

		/**
		 * Everything downloaded goes (the API manager's database and its saved data); the settings
		 * and the rest of the extension's own data stay. The next login downloads it all again.
		 */
		async clearDownloaded() {
			const count = this.downloaded?.subjects ?? 0;
			const question = `Delete the ${count.toLocaleString()} downloaded subjects${this.downloaded?.size ? ` (${this.downloaded.size})` : ''}?\n\nThe next login downloads them all again (a few minutes). Your settings stay.`;
			if (!window.confirm(question)) return;
			this.clearing = true;
			try {
				await new Promise((resolve, reject) => {
					const request = indexedDB.deleteDatabase('WaniKaniAPIManager');
					request.onsuccess = () => resolve();
					request.onerror = () => reject(request.error);
					// open elsewhere (the background): it closes it on this request (Dexie does)
					request.onblocked = () => {};
				});
				for (const key of Object.keys(localStorage)) {
					if (key.startsWith('wanikani_api_manager_')) localStorage.removeItem(key);
				}
				await storage.removeItem('local:initialSyncComplete');
				await storage.removeItem('local:initialSyncStarted');
				await storage.removeItem('local:firstLoadDone');
				await storage.removeItem('local:highlightData');
				this.downloaded = null;
				this.clearedNote = 'Downloaded data cleared: the next login downloads it again.';
			} catch {
				this.clearedNote = 'Couldn\'t clear it: try again in a moment.';
			} finally {
				this.clearing = false;
			}
		},

		cancelDrive() {
			this.driveEntries = null;
			void clearDriveLogin();
		},

		/**
		 * Logs in with the backup's key (checked with WaniKani first); the rest of the backup waits
		 * for the import step, opened right after in Settings → Data → Backup.
		 */
		async restoreFrom(entry) {
			this.driveError = '';
			this.driveStep = 'restore';
			try {
				const text = await downloadDriveBackup(entry.id);
				const key = parseBackup(text).parts.apiKey?.key;
				if (!key) throw new Error('This backup doesn\'t hold an API key after all.');
				// the rest of it waits either way (a new key can log in, then restore it)
				await savePendingRestore(text);
				const result = await validateApiKey(key);
				if (!result.ok) {
					this.driveError = 'The key in this backup no longer works (it may have been deleted on WaniKani). Log in with a new key above: the rest of the backup will wait for you in Settings → Data → Backup.';
					this.driveEntries = null;
					void clearDriveLogin();
					return;
				}
				this.successMessage = `Welcome back, ${result.username}!`;
				await clearDriveLogin();
				// once logged in: the import step, with the rest of the backup
				await this.$router.replace({ name: 'Settings', query: { tab: 'data', section: 'backup' } });
				this.$emit('login', normalizeApiKey(key), this.proxyServer);
			} catch (error) {
				this.driveError = error?.message || 'This backup couldn\'t be read.';
			} finally {
				this.driveStep = '';
			}
		},
	},
};
</script>

<style scoped>
.logo-container {
	display: flex;
	justify-content: center;
	padding: 10px 0;
	background-color: var(--default-color);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
}

.logo-container img {
	max-width: 35%;
	height: auto;
}

.logo-container span {
	font-size: 17px;
	font-weight: bold;
	color: white;
	padding: 5px 0;
}

form {
	text-align: center;
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.input-container {}

input {
	width: 90%;
	margin: auto;
	padding: 10px 15px;
	border: none;
	outline: none;
	border-bottom: 1px solid var(--default-color);
	text-align: center;
}

input:disabled {
	opacity: 0.7;
}

button {
	background-color: var(--default-color);
	color: white;
	border: none;
	padding: 10px;
	border-radius: 50px;
	cursor: pointer;
	width: 30%;
	margin: auto;
}

button:disabled {
	opacity: 0.7;
	cursor: wait;
}

button:hover:not(:disabled) {
	background-color: var(--wanikani);
}

.login-error {
	margin: 0;
	padding: 0 12px;
	font-size: 12px;
	line-height: 1.4;
	color: #c62828;
}

.login-success {
	margin: 0;
	padding: 0 12px;
	font-size: 12px;
	line-height: 1.4;
	color: #2e7d32;
}

.version {
	font-size: 12px;
	color: silver;
}

/* nearly the form's width: short lines, few of them */
.login-hint {
	max-width: min(440px, 100%);
	font-size: 11.5px;
	line-height: 1.4;
	color: var(--font-sec-color, #777);
}

.bottom {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
}

.login-actions {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
}

.login-actions > button[type="submit"] {
	min-width: 60%;
}

/* — or — between the two buttons */
.login-or {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 60%;
	font-size: 11px;
	font-weight: 700;
	color: var(--font-sec-color, #777);
	text-transform: uppercase;
}

.login-or::before,
.login-or::after {
	content: '';
	flex: 1;
	height: 1px;
	background: var(--row-border-color, rgba(0, 0, 0, 0.12));
}

.login-drive-button,
.login-drive-entry,
.login-drive-cancel {
	width: auto;
	min-width: 60%;
	margin: 0;
	border-radius: 50px;
	font-family: inherit;
}

.login-drive-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 9px 18px;
	background: transparent;
	border: 1px solid var(--default-color);
	color: var(--font-color, #2a2d48);
	font-weight: 700;
}

.login-drive-button:hover:not(:disabled) {
	color: white;
}

/* greyed out (signing in, or a browser that can't: see driveSignInAvailable) */
.login-drive-button:disabled {
	opacity: 0.45;
	filter: grayscale(1);
	cursor: not-allowed;
}

.login-drive-logo {
	flex-shrink: 0;
	width: 18px;
	height: 16px;
}

/* subjects kept from before */
.login-downloaded {
	display: flex;
	align-items: center;
	gap: 10px;
	align-self: center;
	width: calc(90% + 14px);
	max-width: 100%;
	box-sizing: border-box;
	margin: 0;
	padding: 9px 12px;
	border-radius: 10px;
	background: color-mix(in srgb, var(--wanikani-sec, #00aaff) 9%, transparent);
	font-size: 12px;
	line-height: 1.45;
	text-align: left;
	color: var(--font-color, #333);
}

.login-downloaded svg {
	flex-shrink: 0;
	width: 20px;
	height: 20px;
	fill: var(--wanikani-sec, #00aaff);
}

.login-downloaded b {
	color: var(--heading-color, #2a2d48);
}

/* the note's own small button, on its right */
.login-downloaded-clear {
	flex-shrink: 0;
	width: auto;
	min-width: 0;
	margin: 0 0 0 auto;
	padding: 5px 12px;
	border: 1px solid var(--error-color, #d33a3a);
	border-radius: 999px;
	background: transparent;
	color: var(--error-color, #d33a3a);
	font-family: inherit;
	font-size: 11.5px;
	font-weight: 700;
	cursor: pointer;
}

.login-downloaded-clear:hover:not(:disabled) {
	background: var(--error-color, #d33a3a);
	color: #fff;
}

.login-downloaded.cleared {
	justify-content: center;
	color: var(--font-sec-color, #777);
}

/* the backups found: a box titled with where they are (Drive's logo, the Google account) */
.login-drive-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	/* as wide as the key field above (90% of its own, slightly narrower, box plus its padding) */
	align-self: center;
	width: calc(90% + 14px);
	max-width: 100%;
	box-sizing: border-box;
	padding: 12px 12px 6px;
	border: 1px solid var(--surface-border-color, #ddd);
	border-radius: 14px;
	background: var(--fill-color, #fff);
	box-shadow: 0 2px 10px var(--shadow-soft-color, rgba(0, 0, 0, 0.06));
}

.login-drive-box-head {
	display: flex;
	align-items: center;
	gap: 10px;
	align-self: stretch;
	padding-bottom: 8px;
	border-bottom: 1px solid var(--surface-border-color, #eee);
}

.login-drive-box-head .login-drive-logo {
	width: 24px;
	height: 22px;
}

.login-drive-box-title {
	display: flex;
	flex-direction: column;
	min-width: 0;
	text-align: left;
	line-height: 1.3;
}

.login-drive-box-title b {
	font-size: 13.5px;
	color: var(--heading-color, #2a2d48);
}

.login-drive-box-title span {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 11.5px;
	color: var(--font-sec-color, #777);
}

.login-drive-box-hint {
	align-self: stretch;
	margin: 0;
	font-size: 12px;
	text-align: left;
	color: var(--font-sec-color, #777);
}

.login-drive-box-hint:empty {
	display: none;
}

.login-drive-box .login-drive-entry {
	width: 100%;
	min-width: 0;
}
/* the picture on the left, the name and where / when on its right */
.login-drive-entry {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 16px 8px 8px;
	border-radius: 12px;
	text-align: left;
}

.login-drive-avatar {
	flex-shrink: 0;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	object-fit: cover;
	border: 2px solid rgba(255, 255, 255, 0.85);
	background: #fff;
}

.login-drive-entry-text {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.login-drive-entry-text span {
	font-size: 11px;
	opacity: 0.8;
}

.login-drive-cancel {
	padding: 6px 14px;
	background: transparent;
	color: var(--font-sec-color, #777);
	font-size: 12px;
}

.login-drive-cancel:hover:not(:disabled) {
	color: white;
}
</style>

<style>
body {
	padding: unset;
}
</style>
