<template>
	<div id="settings-backup" class="settings-section">
		<p class="settings-section-title">Backup</p>
		<div class="settings-section-body">
			<p class="settings-description">
				Save what only this browser knows to a file or to your Google Drive, to keep it safe or to
				bring it to another browser. Your subjects and progress always come back from WaniKani, so
				they aren't in it, and neither is your API key.
			</p>

			<!-- choosing what goes into the file -->
			<template v-if="!pending">
				<p class="backup-heading">What to back up</p>
				<div
					v-for="part in parts"
					:key="part.id"
					class="setting-row backup-part"
					:class="{ empty: !contents[part.id] }"
				>
					<div class="settings-item-label">
						{{ part.label }}
						<span class="backup-part-count">{{ contents[part.id] ?? 'nothing yet' }}</span>
						<span v-if="part.driveOnly" class="backup-part-tag">Google Drive only</span>
						<div class="settings-description">{{ part.description }}</div>
					</div>
					<div
						class="checkbox_wrapper setting-control"
						:class="{ 'checkbox-enabled': contents[part.id] && chosen.includes(part.id), clickable: contents[part.id] }"
						role="switch"
						:aria-checked="Boolean(contents[part.id] && chosen.includes(part.id))"
						:aria-label="`Back up ${part.label}`"
						@click="toggleChosen(part.id)"
					>
						<div class="custom-checkbox-ball"></div>
						<div class="custom-checkbox-back"></div>
					</div>
					<!-- the sentences: real text from the pages read -->
					<!-- open when first seen or just switched on; else its first lines, to open by hand -->
					<CollapsibleNote
						v-if="part.id === 'pageSentences' && chosen.includes('pageSentences') && contents.pageSentences"
						note-id="backup-sentences"
						:start-open="Boolean(justChosen.pageSentences)"
						class="backup-key-warning"
					>
						<b>Your backups will hold text from the pages you read.</b> Sentences are kept from any
						page with Japanese, which can include private ones (mail, chats, accounts).
						<ul>
							<li>In Google Drive: only this extension can open them, but anyone who gets into your Google account could read them.</li>
							<li>In a file: anyone you share the file with can read them.</li>
							<li>Before switching this on, check the sentences kept (each page in Pages read lists its own), and keep private sites out in Settings → Reading.</li>
						</ul>
					</CollapsibleNote>
					<!-- the API key: what it means to keep it in Drive -->
					<CollapsibleNote
						v-if="part.id === 'apiKey' && chosen.includes('apiKey') && contents.apiKey"
						note-id="backup-api-key"
						:start-open="Boolean(justChosen.apiKey)"
						class="backup-key-warning"
					>
						<b>Your API key will be in your Google Drive backups.</b> Only this extension can open
						them, but anyone who gets into your Google account could read it.
						<ul>
							<li>The extension only reads from WaniKani: a key <b>without write permissions</b> (WaniKani's default) is all it needs, and limits what a leaked key could do.</li>
							<li>You can delete the key on WaniKani's API tokens page at any time: it then stops working everywhere, backups included.</li>
						</ul>
					</CollapsibleNote>
				</div>
				<!-- where to: a file, or Google Drive (each a card of its own) -->
				<p class="backup-heading backup-heading-where">Where</p>
				<div class="backup-method">
					<p class="backup-method-title">
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M12 11v6M9.5 14.5 12 17l2.5-2.5" /></svg>
						File
					</p>
					<p v-if="chosen.includes('pageHistory')" class="settings-description backup-warning">
						The file will list the pages you read<template v-if="chosen.includes('pageSentences') && contents.pageSentences">, and sentences from them</template>: keep it somewhere private.
					</p>
					<p v-if="chosen.includes('apiKey')" class="settings-description backup-file-note">
						The API key is never put in a file: files get copied and shared too easily.
					</p>
					<div class="backup-actions">
						<button type="button" class="settings-button" :disabled="!exportable.length" @click="exportFile">
							Export file
						</button>
						<button type="button" class="settings-button secondary" @click="$refs.file.click()">
							Import file…
						</button>
						<input ref="file" type="file" accept=".json,application/json" hidden @change="readFile">
					</div>
				</div>

				<!-- the same backup, in the user's own Google Drive -->
				<div class="backup-method backup-drive">
					<p class="backup-method-title">
						<!-- Google Drive's logo -->
						<svg class="backup-drive-logo" viewBox="0 0 87.3 78" aria-hidden="true">
							<path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
							<path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
							<path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
							<path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
							<path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
							<path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
						</svg>
						Google Drive
					</p>

					<template v-if="!drive.connected">
						<p class="settings-description">
							Keep backups in your own Google Drive, in a hidden folder only this extension can see
							(not your other files). Each browser keeps its last 7, and can back up once a day.
						</p>
						<div class="backup-actions">
							<button
								type="button"
								class="settings-button"
								:disabled="Boolean(driveBusy) || !driveAvailable"
								:title="driveAvailable ? '' : DRIVE_UNAVAILABLE_NOTE"
								@click="connect"
							>
								{{ driveBusy ? 'Signing in…' : 'Connect Google Drive' }}
							</button>
						</div>
						<p v-if="!driveAvailable" class="settings-description backup-error">{{ DRIVE_UNAVAILABLE_NOTE }}</p>
					</template>

					<template v-else>
						<p class="settings-description">
							Connected<template v-if="drive.account"> as <b>{{ drive.account }}</b></template>.
							Last backup from this browser: <b>{{ lastBackupText }}</b>.
						</p>
						<p v-if="drive.lastError" class="settings-description backup-error">{{ drive.lastError }}</p>
						<div class="setting-row backup-part">
							<div class="settings-item-label">
								Back up every day
								<div class="settings-description">With the parts switched on above, in the background</div>
							</div>
							<div
								class="checkbox_wrapper clickable setting-control"
								:class="{ 'checkbox-enabled': drive.auto }"
								role="switch"
								:aria-checked="drive.auto"
								aria-label="Back up to Google Drive every day"
								@click="setAuto(!drive.auto)"
							>
								<div class="custom-checkbox-ball"></div>
								<div class="custom-checkbox-back"></div>
							</div>
						</div>
						<div class="backup-actions">
							<button type="button" class="settings-button" :disabled="Boolean(driveBusy) || !exportable.length" @click="backUpNow">
								{{ driveBusy === 'backup' ? 'Backing up…' : 'Back up now' }}
							</button>
							<button type="button" class="settings-button secondary" :disabled="Boolean(driveBusy)" @click="showDriveBackups">
								{{ driveBusy === 'list' ? 'Loading…' : 'Restore…' }}
							</button>
							<button type="button" class="settings-button secondary backup-disconnect" :disabled="Boolean(driveBusy)" @click="disconnect">
								Disconnect
							</button>
						</div>

						<!-- choosing which backup to restore -->
						<div v-if="driveBackups" class="backup-drive-list" role="list">
							<p v-if="!driveBackups.length" class="settings-description">No backups in Drive yet.</p>
							<p v-else class="settings-description">Choose one to restore, or delete the ones you don't need:</p>
							<div v-for="entry in driveBackups" :key="entry.id" class="backup-drive-row" role="listitem">
								<button
									type="button"
									class="backup-drive-entry"
									:disabled="Boolean(driveBusy)"
									:title="`Restore this backup (${formatDate(entry.modifiedAt)})`"
									@click="openDriveBackup(entry)"
								>
									<!-- whose account (one Drive can hold several): known when the key is in it -->
									<img v-if="entry.username" class="backup-drive-avatar" :src="entry.avatar || defaultAvatar" :alt="entry.username" :title="entry.username" />
									<!-- the browser and the date, then its tags across the whole row -->
									<span class="backup-drive-entry-top">
										<span class="backup-drive-entry-name">{{ entry.deviceName }}</span>
										<span class="backup-drive-entry-date">{{ formatDate(entry.modifiedAt) }}</span>
									</span>
									<span v-if="entry.mine || entry.hasKey" class="backup-drive-entry-tags">
										<span v-if="entry.mine" class="backup-drive-tag mine">This browser</span>
										<span v-if="entry.hasKey" class="backup-drive-tag key" title="Holds the API key: the login screen can restore from it">
											API key{{ entry.username ? ` · ${entry.username}` : '' }}
										</span>
									</span>
								</button>
								<button
									type="button"
									class="backup-drive-delete"
									:disabled="Boolean(driveBusy)"
									:title="`Delete this backup from Google Drive`"
									:aria-label="`Delete the backup from ${entry.deviceName}, ${formatDate(entry.modifiedAt)}`"
									@click="deleteBackups([entry])"
								>
									<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
								</button>
							</div>
							<button
								v-if="driveBackups.length > 1"
								type="button"
								class="backup-drive-delete-all"
								:disabled="Boolean(driveBusy)"
								@click="deleteBackups(driveBackups)"
							>
								{{ driveBusy === 'delete' ? 'Deleting…' : `Delete all ${driveBackups.length} backups` }}
							</button>
						</div>
					</template>
				</div>
			</template>

			<!-- a file was chosen: what to take from it -->
			<!-- outlined: an import under way, not done until "Import" -->
			<div v-else class="backup-import" role="group" aria-label="Import a backup">
				<div class="backup-import-head">
					<span class="backup-import-badge">Not imported yet</span>
				</div>
				<!-- another account's backup (its API key is in it): switch to that account? -->
				<div v-if="switchOffer" class="backup-switch">
					<p class="settings-description">
						This backup is <b>{{ switchOffer.username }}</b>'s<template v-if="currentUsername">: you're logged in as <b>{{ currentUsername }}</b></template>.
						Switch to {{ switchOffer.username }}? Only that account's progress is downloaded: the subjects are kept.
					</p>
					<div class="backup-actions">
						<button type="button" class="settings-button" :disabled="switching" @click="switchAccount">
							{{ switching ? 'Switching…' : `Switch to ${switchOffer.username}` }}
						</button>
						<button type="button" class="settings-button secondary" :disabled="switching" @click="switchOffer = null">
							Only import here
						</button>
					</div>
				</div>
				<p class="settings-description backup-file">
					<template v-if="pendingFromLogin">You logged in from a Google Drive backup. </template>
					Backup from <b>{{ pendingDate }}</b>. Choose what to import, then press Import:
				</p>
				<div v-for="part in pendingParts" :key="part.id" class="setting-row backup-part">
					<div class="settings-item-label">
						{{ part.label }}
						<span class="backup-part-count">{{ pendingContents[part.id] }}</span>
						<div class="settings-description">
							{{ part.id === 'settings' ? 'Replaces your current settings (the site lists are combined)' : 'Added to what\'s here, nothing is removed' }}
						</div>
					</div>
					<div
						class="checkbox_wrapper clickable setting-control"
						:class="{ 'checkbox-enabled': chosenImport.includes(part.id) }"
						role="switch"
						:aria-checked="chosenImport.includes(part.id)"
						:aria-label="`Import ${part.label}`"
						@click="toggle(chosenImport, part.id)"
					>
						<div class="custom-checkbox-ball"></div>
						<div class="custom-checkbox-back"></div>
					</div>
				</div>
				<div class="backup-actions">
					<button type="button" class="settings-button" :disabled="!chosenImport.length || importing" @click="importFile">
						{{ importing ? 'Importing…' : 'Import' }}
					</button>
					<button type="button" class="settings-button secondary" :disabled="importing" @click="cancelImport">
						Cancel
					</button>
				</div>
			</div>

			<p v-if="error" class="settings-description backup-error">{{ error }}</p>
			<ul v-if="results.length" class="settings-description backup-results">
				<li v-for="line in results" :key="line">{{ line }}</li>
			</ul>
		</div>
	</div>
</template>

<script>
import { markRaw } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useWKStore } from '@/stores';
import { validateApiKey } from '@/utils/scripts/apiKeyValidation';
import {
	BACKUP_PARTS,
	backupContents,
	backupFileName,
	clearPendingRestore,
	createBackup,
	describeBackup,
	parseBackup,
	readBackupChoice,
	readPendingRestore,
	restoreBackup,
	saveBackupChoice,
	savePendingRestore,
} from '@/utils/scripts/backup';
import defaultAvatar from '@/assets/wanikani-default.png';
import CollapsibleNote from '@/components/Settings/CollapsibleNote.vue';
import {
	DRIVE_UNAVAILABLE_NOTE,
	backUpToDrive,
	connectDrive,
	driveSignInAvailable,
	deleteDriveBackup,
	disconnectDrive,
	downloadDriveBackup,
	listDriveBackups,
	readDriveBackupState,
	setDriveAutoBackup,
	watchDriveBackupState,
} from '@/utils/scripts/driveBackup';

export default {
	name: 'SettingsBackup',

	components: { CollapsibleNote },

	data() {
		return {
			parts: BACKUP_PARTS,
			/** per part: "12 pages", or null (nothing to save) */
			contents: {},
			chosen: [],
			/** parts switched on just now: their notes show whole (else collapsed, once seen) */
			justChosen: {},
			/** a backup read from a file, waiting for "Import" */
			pending: null,
			pendingContents: {},
			chosenImport: [],
			importing: false,
			error: '',
			results: [],
			/** Google Drive: connected, account, daily backup, last one */
			drive: { connected: false, auto: true, account: null, lastBackupAt: null, lastError: null },
			/** what's under way: 'connect' | 'backup' | 'list' | 'download' | '' */
			driveBusy: '',
			/** the backups in Drive, while choosing one to restore */
			driveBackups: null,
			/** the pending backup was chosen on the login screen (its API key logged in) */
			pendingFromLogin: false,
			/** for a backup's account without a picture */
			defaultAvatar,
			/** another account's Drive backup opened: { username, key, text } (switch to it?) */
			switchOffer: null,
			switching: false,
			/** this browser has a way to sign in to Google (Kiwi doesn't) */
			driveAvailable: driveSignInAvailable(),
			DRIVE_UNAVAILABLE_NOTE,
		};
	},

	computed: {
		exportable() {
			return this.chosen.filter(id => this.contents[id]);
		},
		/** the WaniKani account logged in now */
		currentUsername() {
			return String(useWKStore().userInfo?.username ?? '');
		},
		pendingParts() {
			return this.parts.filter(part => this.pendingContents[part.id]);
		},
		pendingDate() {
			const date = new Date(this.pending?.exportedAt);
			return Number.isNaN(date.getTime()) ? 'an unknown date' : this.formatDate(date);
		},
		lastBackupText() {
			return this.drive.lastBackupAt ? this.formatDate(this.drive.lastBackupAt) : 'none yet';
		},
	},

	async mounted() {
		const [, chosen, drive] = await Promise.all([this.loadContents(), readBackupChoice(), readDriveBackupState()]);
		// all of them, until one is switched off (remembered: the daily backup uses them too)
		this.chosen = chosen;
		this.drive = drive;
		this.unwatchDrive = watchDriveBackupState(state => { this.drive = state; });
		// logged in from a Drive backup: the rest of it, waiting to be imported
		const fromLogin = await readPendingRestore();
		if (fromLogin) {
			try {
				this.openBackup(fromLogin);
				this.pendingFromLogin = true;
			} catch {
				await clearPendingRestore();
			}
		}
	},

	beforeUnmount() {
		this.unwatchDrive?.();
	},

	methods: {
		formatDate(value) {
			return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
		},

		toggleChosen(id) {
			if (!this.contents[id]) return;
			this.toggle(this.chosen, id);
			// switched on now: its note (if it has one) shows whole
			this.justChosen = { ...this.justChosen, [id]: this.chosen.includes(id) };
			void saveBackupChoice(this.chosen);
		},

		/** runs a Drive step, showing what went wrong */
		async driveStep(busy, step) {
			this.driveBusy = busy;
			this.error = '';
			this.results = [];
			try {
				await step();
			} catch (error) {
				this.error = error?.message || 'Google Drive didn\'t answer. Try again in a moment.';
			} finally {
				this.driveBusy = '';
			}
		},

		connect() {
			return this.driveStep('connect', async () => {
				this.drive = await connectDrive();
			});
		},

		disconnect() {
			return this.driveStep('connect', async () => {
				await disconnectDrive();
				this.driveBackups = null;
			});
		},

		setAuto(auto) {
			this.drive = { ...this.drive, auto };
			void setDriveAutoBackup(auto);
		},

		backUpNow() {
			return this.driveStep('backup', async () => {
				this.drive = await backUpToDrive();
				this.results = ['Backed up to Google Drive.'];
				// the list (if open) shows the new one
				if (this.driveBackups) this.driveBackups = await listDriveBackups();
			});
		},

		showDriveBackups() {
			if (this.driveBackups) {
				this.driveBackups = null;
				return undefined;
			}
			return this.driveStep('list', async () => {
				this.driveBackups = await listDriveBackups();
			});
		},

		/** Removes backups from Drive, after asking (it can't be undone). */
		deleteBackups(entries) {
			const withKey = entries.some(entry => entry.hasKey);
			const what = entries.length === 1
				? `the backup from ${entries[0].deviceName} (${this.formatDate(entries[0].modifiedAt)})`
				: `all ${entries.length} backups`;
			const question = `Delete ${what} from Google Drive?${withKey ? '\n\nYour API key is removed from Drive with it.' : ''}\n\nThis can't be undone.`;
			if (!window.confirm(question)) return undefined;
			return this.driveStep('delete', async () => {
				for (const entry of entries) await deleteDriveBackup(entry.id);
				this.driveBackups = await listDriveBackups();
				this.results = [entries.length === 1 ? 'Backup deleted from Google Drive.' : `${entries.length} backups deleted from Google Drive.`];
			});
		},

		/** a backup from Drive: into the same import step as a file (another account's: offered a switch) */
		openDriveBackup(entry) {
			return this.driveStep('download', async () => {
				const text = await downloadDriveBackup(entry.id);
				this.openBackup(text);
				this.driveBackups = null;
				const apiKey = this.pending?.parts?.apiKey;
				const username = apiKey?.username || entry.username;
				const other = username && this.currentUsername && username.toLowerCase() !== this.currentUsername.toLowerCase();
				this.switchOffer = apiKey?.key && other ? { username, key: apiKey.key, text } : null;
			});
		},

		/**
		 * Logs in as the backup's account (its key checked first): this one's data goes, the
		 * subjects stay. The backup waits to be imported, as after logging in from it.
		 */
		async switchAccount() {
			const offer = this.switchOffer;
			if (!offer) return;
			this.switching = true;
			this.error = '';
			try {
				const check = await validateApiKey(offer.key);
				if (!check.ok) {
					this.error = `${offer.username}'s key in this backup no longer works (it may have been deleted on WaniKani).`;
					this.switchOffer = null;
					return;
				}
				await savePendingRestore(offer.text);
				await useWKStore().switchAccount(offer.key, '#/settings?tab=data&section=backup');
			} catch (error) {
				this.error = error?.message || 'Couldn\'t switch accounts.';
			} finally {
				this.switching = false;
			}
		},

		/** a part's switch: in or out of the list (nothing to save: stays off) */
		toggle(list, id, disabled = false) {
			if (disabled) return;
			const index = list.indexOf(id);
			if (index >= 0) list.splice(index, 1);
			else list.push(id);
		},

		async loadContents() {
			this.contents = await backupContents();
		},

		async exportFile() {
			this.error = '';
			this.results = [];
			const backup = await createBackup(this.exportable);
			const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 1)], { type: 'application/json' }));
			const link = document.createElement('a');
			link.href = url;
			link.download = backupFileName();
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 10_000);
		},

		async readFile(event) {
			const file = event.target.files?.[0];
			event.target.value = '';
			if (!file) return;
			this.error = '';
			this.results = [];
			try {
				this.openBackup(await file.text());
			} catch (error) {
				this.error = error.message;
			}
		},

		/** a backup's text (file or Drive): checked, then waiting for "Import" */
		openBackup(text) {
			const backup = parseBackup(text);
			const contents = describeBackup(backup);
			if (!Object.keys(contents).length) throw new Error('This backup is empty.');
			// not made reactive: it's only read (and stored as it is)
			this.pending = markRaw(backup);
			this.pendingContents = contents;
			this.chosenImport = Object.keys(contents);
		},

		cancelImport() {
			this.switchOffer = null;
			this.pending = null;
			this.pendingContents = {};
			this.chosenImport = [];
			// imported or not wanted: the daily backup can run again
			if (this.pendingFromLogin) void clearPendingRestore();
			this.pendingFromLogin = false;
		},

		async importFile() {
			this.importing = true;
			this.error = '';
			try {
				const results = await restoreBackup(this.pending, this.chosenImport);
				// the open settings show the imported ones
				if (this.chosenImport.includes('settings')) await useSettingsStore().init();
				this.results = results.length ? results : ['Nothing new to import.'];
				this.cancelImport();
				await this.loadContents();
			} catch {
				this.error = 'The import stopped partway: some of it may have been added.';
			} finally {
				this.importing = false;
			}
		},
	},
};
</script>

<style scoped>
.settings-section-body > .settings-description:first-child {
	padding-bottom: 4px;
}

.backup-part.empty {
	opacity: 0.55;
}

.backup-part-count {
	margin-left: 6px;
	font-size: 11px;
	font-weight: 600;
	color: var(--font-sec-color);
}

.backup-actions {
	display: flex;
	gap: 8px;
	padding: 8px 12px 12px;
}

.backup-actions .settings-button:disabled {
	opacity: 0.5;
	cursor: default;
}

.backup-warning {
	color: var(--warning-color, #c48d0f);
}

/* "What to back up" / "Where": small labels splitting the section in two */
.backup-heading {
	margin: 0;
	padding: 12px 12px 2px;
	font-size: 10.5px;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--font-sec-color);
}

.backup-heading-where {
	padding-top: 16px;
}

/* a way to back up (file, Google Drive): an inset card */
.backup-method {
	margin: 6px 12px 0;
	border: 1px solid var(--row-border-color);
	border-radius: 12px;
	background: var(--surface-muted-color, rgba(0, 0, 0, 0.03));
	overflow: hidden;
}

.backup-method:last-of-type {
	margin-bottom: 12px;
}

.backup-method .backup-actions {
	padding: 8px 12px 12px;
}

.backup-method-title {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 0;
	padding: 10px 12px 0;
	font-size: 13px;
	font-weight: 800;
	color: var(--font-color);
}

/* the real logo keeps its colors (not the outline icons' stroke) */
.backup-method-title svg.backup-drive-logo {
	width: 17px;
	height: 15px;
	stroke: none;
}

.backup-method > .backup-warning {
	margin: 0;
	padding: 4px 12px 0;
}

.backup-method-title svg {
	width: 16px;
	height: 16px;
	fill: none;
	stroke: currentColor;
	stroke-width: 1.8;
	stroke-linejoin: round;
}

.backup-drive > .settings-description {
	margin: 0;
	padding: 6px 12px 0;
}

.backup-drive > .backup-part {
	margin-top: 6px;
	border-top: 1px solid var(--row-border-color);
	background: transparent;
}

.backup-disconnect {
	margin-left: auto;
}

.backup-drive-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin: 0 12px 12px;
}

.backup-drive-list > .settings-description {
	margin: 0;
}

.backup-drive-entry {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 9px 12px;
	border: 1px solid var(--row-border-color);
	border-radius: 10px;
	background: var(--fill-color);
	color: var(--font-color);
	font-family: inherit;
	font-size: 12px;
	text-align: left;
	cursor: pointer;
	transition: border-color 0.15s, background-color 0.15s;
}

.backup-drive-entry:hover:not(:disabled) {
	border-color: var(--pill-color, #e36f94);
}

/* a backup: restore (most of the row), delete (the bin) */
.backup-drive-row {
	display: flex;
	align-items: stretch;
	gap: 6px;
}

.backup-drive-row .backup-drive-entry {
	flex: 1;
	min-width: 0;
}

.backup-drive-delete {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	padding: 0;
	border: 1px solid var(--row-border-color);
	border-radius: 10px;
	background: var(--fill-color);
	color: var(--font-sec-color);
	cursor: pointer;
	transition: color 0.15s, border-color 0.15s;
}

.backup-drive-delete svg {
	width: 16px;
	height: 16px;
	fill: none;
	stroke: currentColor;
	stroke-width: 1.8;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.backup-drive-delete:hover:not(:disabled) {
	color: var(--error-color, #d33a3a);
	border-color: var(--error-color, #d33a3a);
}

.backup-drive-delete-all {
	align-self: flex-end;
	padding: 4px 2px;
	border: none;
	background: none;
	color: var(--error-color, #d33a3a);
	font-family: inherit;
	font-size: 11.5px;
	font-weight: 700;
	cursor: pointer;
}

.backup-drive-delete-all:hover:not(:disabled) {
	text-decoration: underline;
}

/* the account's picture (when known) on the left; name and date on top, the tags under them
   (whole tags wrap, never split mid-pill) */
.backup-drive-row .backup-drive-entry {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	align-content: center;
	align-items: center;
	gap: 5px 0;
}

.backup-drive-entry-top,
.backup-drive-entry-tags {
	grid-column: 2;
}

.backup-drive-avatar {
	grid-column: 1;
	grid-row: 1 / span 2;
	width: 32px;
	height: 32px;
	margin-right: 10px;
	border-radius: 50%;
	object-fit: cover;
	border: 1px solid var(--surface-border-color);
	background: var(--surface-muted-color);
}

.backup-drive-entry-top {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 10px;
	min-width: 0;
}

.backup-drive-entry-name {
	font-weight: 700;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.backup-drive-entry-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

/* both tags alike: soft tint, coloured text */
.backup-drive-tag {
	padding: 0 6px;
	border-radius: 5px;
	font-size: 10px;
	font-weight: 700;
	line-height: 16px;
	white-space: nowrap;
}

.backup-drive-tag.mine {
	background: color-mix(in srgb, var(--pill-color, #e36f94) 15%, transparent);
	color: color-mix(in srgb, var(--pill-color, #e36f94) 80%, var(--font-color, #2a2d48));
}

.backup-drive-tag.key {
	background: color-mix(in srgb, var(--warning-color, #c48d0f) 15%, transparent);
	color: var(--warning-color, #c48d0f);
}

.backup-part-tag {
	margin-left: 6px;
	padding: 1px 7px;
	border-radius: 999px;
	background: var(--surface-muted-color, rgba(0, 0, 0, 0.06));
	font-size: 10px;
	font-weight: 700;
	color: var(--font-sec-color);
	white-space: nowrap;
}

/* under the API key's row, across it (the row is a grid) */
.backup-key-warning {
	grid-column: 1 / -1;
	padding: 9px 11px;
	border-radius: 10px;
	border: 1px solid color-mix(in srgb, var(--warning-color, #c48d0f) 45%, transparent);
	background: color-mix(in srgb, var(--warning-color, #c48d0f) 9%, transparent);
	font-size: 11.5px;
	font-weight: normal;
	line-height: 1.45;
	color: var(--font-color);
}

.backup-key-warning ul {
	margin: 5px 0 0;
	padding-left: 16px;
	list-style: disc;
}

.backup-key-warning li + li {
	margin-top: 3px;
}

.backup-method > .backup-file-note {
	margin: 0;
	padding: 4px 12px 0;
}

.backup-drive-entry-date {
	flex-shrink: 0;
	color: var(--font-sec-color);
}

.backup-import {
	margin: 4px 10px 12px;
	border: 2px solid var(--pill-color, #e36f94);
	border-radius: 12px;
	background: color-mix(in srgb, var(--pill-color, #e36f94) 6%, transparent);
	overflow: hidden;
}

/* another account's backup: switch to it? (on top of the import step) */
.backup-switch {
	margin: 10px 12px 2px;
	padding: 10px 12px;
	border-radius: 10px;
	border: 1px solid color-mix(in srgb, var(--wanikani-sec, #00aaff) 45%, transparent);
	background: color-mix(in srgb, var(--wanikani-sec, #00aaff) 8%, transparent);
}

.backup-switch > .settings-description {
	margin: 0 0 8px;
}

.backup-switch .backup-actions {
	padding: 0;
}

.backup-import-head {
	padding: 10px 12px 0;
}

.backup-import-badge {
	display: inline-block;
	padding: 2px 9px;
	border-radius: 999px;
	background: var(--pill-color, #e36f94);
	color: #fff;
	font-size: 10px;
	font-weight: 800;
	letter-spacing: 0.06em;
	text-transform: uppercase;
}

.backup-import > .backup-file {
	margin: 0;
	padding: 6px 12px 2px;
}

.settings-section-body > .backup-error {
	padding-top: 0;
	color: var(--error-color, #d33a3a);
}

.backup-results {
	margin: 0;
	padding: 0 12px 12px 28px;
}
</style>
