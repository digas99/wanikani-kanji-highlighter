<template>
	<div class="container friends-page">
		<section class="friends-card">
			<header class="friends-head">
				<span class="friends-title">Friends</span>
				<span v-if="statusLabel" class="friends-meta">
					<span v-if="refreshing" class="friends-spinner" aria-hidden="true"></span>
					{{ statusLabel }}
				</span>
			</header>

			<form class="friends-add" @submit.prevent="add">
				<input
					v-model.trim="newName"
					type="text"
					class="friends-input"
					placeholder="WaniKani username"
					maxlength="40"
					autocomplete="off"
					spellcheck="false"
					:disabled="adding || atLimit"
				>
				<button type="submit" class="friends-add-button" :disabled="adding || atLimit || !newName">
					{{ adding ? 'Checking…' : 'Add' }}
				</button>
			</form>
			<!-- hibernating on WaniKani: add anyway? (their row stays disabled until they're back) -->
			<div v-if="confirmHibernating" class="friends-confirm">
				<p>
					<b>{{ confirmHibernating }}</b> is hibernating on WaniKani 💤 Add anyway? Their row stays
					disabled until they come back (checked every few days).
				</p>
				<div class="friends-confirm-actions">
					<button type="button" class="friends-add-button" :disabled="adding" @click="addHibernating">Add anyway</button>
					<button type="button" class="friends-cancel-button" :disabled="adding" @click="confirmHibernating = ''">Cancel</button>
				</div>
			</div>
			<p v-else-if="message" class="friends-message" :class="{ error: messageIsError }">{{ message }}</p>
			<p v-else-if="atLimit" class="friends-message">That's the most friends for now ({{ maxFriends }}).</p>

			<ul class="friends-list">
				<li v-for="row in rows" :key="row.key" class="friend-row" :class="{ me: row.me, failed: row.failed, hibernating: row.hibernating }">
					<img v-if="row.avatar" class="friend-avatar" :src="row.avatar" alt="">
					<span v-else class="friend-avatar friend-avatar-empty" aria-hidden="true">{{ row.initial }}</span>

					<div class="friend-main">
						<div class="friend-name-line">
							<a
								class="friend-name"
								:href="row.url"
								target="_blank"
								rel="noopener"
								:title="`Open ${row.username}'s WaniKani profile`"
							>{{ row.username }}</a>
							<span v-if="row.me" class="friend-you">You</span>
							<span v-if="row.levelUp" class="friend-levelup" :title="row.levelUp.title">↑ {{ row.levelUp.label }}</span>
						</div>
						<div v-if="row.total" class="friend-srs" :title="row.srsTitle">
							<span
								v-for="part in row.srs"
								:key="part.key"
								:style="{ flexGrow: part.value, backgroundColor: part.color }"
							></span>
						</div>
						<div class="friend-sub" :title="row.hibernating ? row.hibernationTitle : undefined">
							<template v-if="row.failed">{{ row.failed }}</template>
							<template v-else-if="row.hibernating">{{ row.hibernationLabel }}</template>
							<template v-else>{{ row.sub }}</template>
						</div>
					</div>

					<span
						class="friend-level"
						:title="row.hibernating ? 'Hibernating on WaniKani' : row.stage ? `Level ${row.level} · ${row.stage}` : `Level ${row.level}`"
					>
						<template v-if="row.hibernating && row.level == null">💤</template>
						<template v-else><small>Lv</small>{{ row.level ?? '–' }}</template>
					</span>

					<!-- a corner badge: the level badges stay aligned with your own row (which has none) -->
					<button
						v-if="!row.me"
						type="button"
						class="friend-remove"
						:title="`Remove ${row.username}`"
						:aria-label="`Remove ${row.username}`"
						@click="remove(row.username)"
					>×</button>
				</li>
			</ul>

			<p v-if="!friends.length" class="friends-empty">
				Add friends by their WaniKani username to compare levels. Only what's on their public
				WaniKani profile is shown.
			</p>
		</section>
	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import { useSettingsStore } from '@/stores/settings';
import {
	LEVEL_UP_SHOWN_MS,
	MAX_FRIENDS,
	readFriends,
	removeFriend,
	requestAddFriend,
	requestRefreshFriends,
	watchFriends,
} from '@/utils/scripts/friends';
import { srsStages } from '@/utils/scripts/wanikani';
import { LOCKED_SEGMENT_COLOR } from '@/utils/scripts/schoolKanji';

const SRS_GROUPS = [
	{ key: 'apprentice', label: 'Apprentice', appearance: 'ap4_color', fallback: srsStages[4].color },
	{ key: 'guru', label: 'Guru', appearance: 'gr2_color', fallback: srsStages[6].color },
	{ key: 'master', label: 'Master', appearance: 'mst_color', fallback: srsStages[7].color },
	{ key: 'enlightened', label: 'Enlightened', appearance: 'enl_color', fallback: srsStages[8].color },
	{ key: 'burned', label: 'Burned', appearance: 'brn_color', fallback: srsStages[9].color },
	// the rest of WaniKani: shows how far along each one is overall
	{ key: 'locked', label: 'Locked', appearance: null, fallback: LOCKED_SEGMENT_COLOR },
];

const ADD_ERRORS = {
	invalid: 'That doesn\'t look like a WaniKani username.',
	duplicate: 'Already in your friends.',
	limit: `That's the most friends for now (${MAX_FRIENDS}).`,
	not_found: 'No WaniKani user with that name.',
	unreachable: 'Couldn\'t reach WaniKani. Try again in a moment.',
	self: 'That\'s you! You\'re always at the top of the list.',
};

function relativeDay(time) {
	const days = Math.floor((Date.now() - time) / 86400000);
	if (days <= 0) return 'today';
	if (days === 1) return 'yesterday';
	return `${days}d ago`;
}

export default {
	name: 'Friends',

	data() {
		return {
			state: null,
			newName: '',
			adding: false,
			message: '',
			messageIsError: false,
			/** the name of a hibernating user waiting for "Add anyway?" */
			confirmHibernating: '',
			maxFriends: MAX_FRIENDS,
			/** every subject WaniKani has: what isn't started is locked (the same content for everyone) */
			totalSubjects: 0,
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		friends() {
			return this.state?.friends ?? [];
		},
		atLimit() {
			return this.friends.length >= MAX_FRIENDS;
		},
		/** a refresh that died with the background script shouldn't spin forever */
		refreshing() {
			return Boolean(this.state?.refreshing && Date.now() - (this.state.refreshStartedAt ?? 0) < 3 * 60 * 1000);
		},
		statusLabel() {
			if (this.refreshing) return 'Checking…';
			if (!this.friends.length || !this.state?.refreshedAt) return '';
			const time = new Date(this.state.refreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			return `Checked ${time}`;
		},
		appearance() {
			return useSettingsStore().settings.appearance ?? {};
		},
		/** Your own row, from what the extension already has (no profile download). */
		myRow() {
			const user = this.wk.userInfo ?? {};
			const srs = { apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0 };
			for (const assignment of this.wk.assignments) {
				if (assignment.hidden) continue;
				const stage = assignment.srs_stage;
				if (stage >= 1 && stage <= 4) srs.apprentice += 1;
				else if (stage === 5 || stage === 6) srs.guru += 1;
				else if (stage === 7) srs.master += 1;
				else if (stage === 8) srs.enlightened += 1;
				else if (stage === 9) srs.burned += 1;
			}
			return this.buildRow({
				key: 'me',
				me: true,
				username: user.username || 'You',
				level: user.level ?? null,
				startedAt: user.started_at ?? null,
				avatar: this.wk.userAvatar || null,
				srs,
			});
		},
		/** You first, then friends by level (highest first). */
		rows() {
			const friends = this.friends
				.map(friend => this.buildRow({
					key: friend.username.toLowerCase(),
					username: friend.profile?.username || friend.username,
					level: friend.profile?.level ?? null,
					stage: friend.profile?.stage ?? '',
					startedAt: friend.profile?.startedAt ?? null,
					avatar: friend.profile?.avatar ?? null,
					srs: friend.profile?.srs ?? null,
					failed: friend.error === 'not_found'
						? 'Not found on WaniKani (renamed or deleted?)'
						: friend.error === 'unreachable' && !friend.profile ? 'Couldn\'t reach WaniKani yet' : '',
					levelUpAt: friend.levelUpAt,
					levelUpFrom: friend.levelUpFrom,
					hibernating: Boolean(friend.hibernating),
					hibernationChangedAt: friend.hibernationChangedAt ?? null,
				}))
				// active friends by level, then the hibernating ones
				.sort((a, b) => Number(a.hibernating) - Number(b.hibernating)
					|| (b.level ?? -1) - (a.level ?? -1)
					|| a.username.localeCompare(b.username));
			return [this.myRow, ...friends];
		},
	},

	async created() {
		void this.wk.countAllSubjects().then(count => { this.totalSubjects = count; });
		this.state = await readFriends();
		this.unwatch = watchFriends(state => { this.state = state; });
		// opening the list: refresh it (at most every few minutes)
		requestRefreshFriends();
	},

	beforeUnmount() {
		this.unwatch?.();
	},

	methods: {
		buildRow({ key, me = false, username, level, stage = '', startedAt, avatar, srs: started, failed = '', levelUpAt = null, levelUpFrom = null, hibernating = false, hibernationChangedAt = null }) {
			const total = started ? Object.values(started).reduce((sum, value) => sum + value, 0) : 0;
			const srs = started && { ...started, locked: Math.max(0, this.totalSubjects - total) };
			const year = startedAt ? new Date(startedAt).getFullYear() : null;
			const burned = srs?.burned ?? 0;
			const showLevelUp = levelUpAt && Date.now() - levelUpAt < LEVEL_UP_SHOWN_MS;
			// shares of all of WaniKani (the same for everyone): unlocked so far, and burned
			const share = value => {
				const percent = (value / this.totalSubjects) * 100;
				return percent > 0 && percent < 1 ? '<1%' : `${Math.round(percent)}%`;
			};
			const statsLine = [
				this.totalSubjects && `${share(total)} unlocked`,
				`${burned.toLocaleString()} burned${this.totalSubjects ? ` (${share(burned)})` : ''}`,
				year && `since ${year}`,
			].filter(Boolean).join(' · ');
			return {
				key,
				me,
				username,
				initial: username.charAt(0).toUpperCase(),
				url: `https://www.wanikani.com/users/${encodeURIComponent(username)}`,
				level,
				stage,
				avatar,
				failed,
				total,
				srs: SRS_GROUPS.map(group => ({
					key: group.key,
					value: srs?.[group.key] ?? 0,
					color: (group.appearance && this.appearance[group.appearance]) || group.fallback,
				})),
				srsTitle: srs
					? SRS_GROUPS.filter(group => group.key !== 'locked' || this.totalSubjects)
						.map(group => `${group.label}: ${srs[group.key].toLocaleString()}`).join('\n')
					: '',
				sub: statsLine,
				hibernating,
				// went into hibernation after being added: their last stats stay (greyed out)
				hibernationLabel: started ? `💤 Hibernating · ${statsLine}` : '💤 Hibernating on WaniKani',
				hibernationTitle: hibernationChangedAt
					? `Hibernating on WaniKani since ${new Date(hibernationChangedAt).toLocaleDateString()}: these are their stats from before. Checked every few days.`
					: 'Hibernating on WaniKani. Checked every few days.',
				levelUp: showLevelUp && !hibernating
					? {
						label: relativeDay(levelUpAt),
						title: `Level ${levelUpFrom} → ${level}, noticed ${new Date(levelUpAt).toLocaleDateString()} (checked once a day, so it may have been a little earlier)`,
					}
					: null,
			};
		},
		async add() {
			if (!this.newName || this.adding) return;
			this.confirmHibernating = '';
			await this.submit(this.newName, false);
		},
		/** the user confirmed: add them while they hibernate */
		async addHibernating() {
			const name = this.confirmHibernating;
			if (!name || this.adding) return;
			await this.submit(name, true);
			this.confirmHibernating = '';
		},
		async submit(name, allowHibernating) {
			this.adding = true;
			this.message = '';
			const result = await requestAddFriend(name, this.wk.userInfo?.username, allowHibernating);
			this.adding = false;
			if (result.ok) {
				this.newName = '';
				this.message = `Added ${name}.`;
				this.messageIsError = false;
			} else if (result.reason === 'hibernating') {
				this.confirmHibernating = name;
			} else {
				this.message = ADD_ERRORS[result.reason] ?? ADD_ERRORS.unreachable;
				this.messageIsError = true;
			}
		},
		async remove(username) {
			await removeFriend(username);
			this.message = '';
		},
	},
};
</script>

<style scoped>
.friends-page {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding-top: 12px;
	padding-bottom: 20px;
}

.friends-card {
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	border-radius: var(--card-radius, 12px);
	box-shadow: 0 2px 10px var(--shadow-soft-color);
	padding: 12px;
}

.friends-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.friends-title {
	padding: 3px 10px;
	border-radius: 999px;
	background: var(--pill-color, #e36f94);
	color: #fff;
	font-weight: 700;
	font-size: 11.5px;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.friends-meta {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 11.5px;
	color: var(--font-sec-color);
}

.friends-spinner {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	border: 2px solid var(--surface-border-color);
	border-top-color: var(--wanikani-sec);
	animation: friends-spin 0.8s linear infinite;
}

@keyframes friends-spin {
	to {
		transform: rotate(360deg);
	}
}

.friends-add {
	display: flex;
	gap: 8px;
	margin-top: 12px;
}

.friends-input {
	flex: 1;
	min-width: 0;
	padding: 7px 10px;
	border: 1px solid var(--surface-border-color);
	border-radius: 8px;
	background: var(--surface-muted-color);
	color: var(--font-color);
	font-family: inherit;
	font-size: 12.5px;
}

.friends-add-button {
	padding: 7px 14px;
	border: none;
	border-radius: 8px;
	background: var(--pill-color, #e36f94);
	color: #fff;
	font-family: inherit;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
}

.friends-add-button:disabled {
	opacity: 0.55;
	cursor: default;
}

.friends-message {
	margin: 6px 2px 0;
	font-size: 11.5px;
	color: var(--font-sec-color);
}

.friends-message.error {
	color: var(--error-color, #c0392b);
}

.friends-list {
	list-style: none;
	margin: 12px 0 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	/* room for the corner remove badges */
	gap: 10px;
}

.friend-row {
	position: relative;
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 8px 8px 10px;
	border-radius: 10px;
	border: 1px solid var(--surface-border-color);
	background: var(--surface-muted-color);
}

.friend-row.me {
	border-color: var(--pill-color, #e36f94);
}

.friend-row.failed {
	opacity: 0.65;
}

/* hibernating on WaniKani: disabled until they're back (the remove badge stays usable) */
.friend-row.hibernating > :not(.friend-remove) {
	opacity: 0.5;
	filter: grayscale(1);
}

.friends-confirm {
	margin-top: 8px;
	padding: 10px 12px;
	border-radius: 10px;
	border: 1px solid var(--surface-border-color);
	border-left: 4px solid #8a8fa3;
	background: var(--surface-muted-color);
	font-size: 12px;
	color: var(--font-color);
}

.friends-confirm p {
	margin: 0 0 8px;
	line-height: 1.4;
}

.friends-confirm-actions {
	display: flex;
	gap: 8px;
}

.friends-cancel-button {
	padding: 7px 14px;
	border: 1px solid var(--surface-border-color);
	border-radius: 8px;
	background: var(--fill-color);
	color: var(--font-sec-color);
	font-family: inherit;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
}

.friend-avatar {
	flex-shrink: 0;
	width: 34px;
	height: 34px;
	border-radius: 8px;
	object-fit: cover;
	background: var(--fill-color);
}

.friend-avatar-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: 800;
	color: var(--font-sec-color);
}

.friend-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.friend-name-line {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
}

.friend-name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: 800;
	font-size: 13px;
	color: var(--heading-color, #2a2d48);
	text-decoration: none;
}

.friend-name:hover {
	text-decoration: underline;
}

.friend-you,
.friend-levelup {
	flex-shrink: 0;
	padding: 1px 7px;
	border-radius: 999px;
	font-size: 10px;
	font-weight: 800;
}

.friend-you {
	background: var(--pill-color, #e36f94);
	color: #fff;
}

.friend-levelup {
	background: color-mix(in srgb, #30a46c 18%, transparent);
	color: #30a46c;
	cursor: help;
}

/* a thin bar of their SRS stages, in your SRS colors */
.friend-srs {
	display: flex;
	height: 5px;
	border-radius: 999px;
	overflow: hidden;
	background: var(--surface-border-color);
}

.friend-srs span {
	flex-basis: 0;
	min-width: 0;
}

.friend-sub {
	font-size: 11px;
	color: var(--font-sec-color);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.friend-level {
	flex-shrink: 0;
	display: flex;
	align-items: baseline;
	gap: 2px;
	min-width: 44px;
	justify-content: center;
	padding: 5px 8px;
	border-radius: 8px;
	background: var(--default-color);
	color: #fff;
	font-size: 16px;
	font-weight: 800;
	cursor: default;
}

.friend-level small {
	font-size: 9.5px;
	font-weight: 700;
	opacity: 0.75;
}

/* remove: a small badge on the row's corner (shown on hover; always on touch screens) */
.friend-remove {
	position: absolute;
	top: -7px;
	right: -7px;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	padding: 0;
	border: 1px solid var(--surface-border-color);
	border-radius: 50%;
	background: var(--fill-color);
	box-shadow: 0 1px 4px var(--shadow-soft-color);
	color: var(--font-sec-color);
	font-size: 14px;
	line-height: 1;
	cursor: pointer;
	opacity: 0;
	transition: opacity 0.15s, color 0.15s;
}

.friend-row:hover .friend-remove,
.friend-remove:focus-visible {
	opacity: 1;
}

.friend-remove:hover {
	color: var(--error-color, #c0392b);
}

@media (hover: none) {
	.friend-remove {
		opacity: 1;
	}
}

.friends-empty {
	margin: 10px 2px 2px;
	font-size: 12px;
	color: var(--font-sec-color);
}

</style>
