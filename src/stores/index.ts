import { deleteLegacyIndexedDb, removeLegacyKeys } from '@/utils/scripts/migrateFromV15';
import { defineStore } from 'pinia';
import { toRaw } from 'vue';
import { getWKManager, resetWKManager, DASHBOARD_REFRESH_MS, DEFAULT_PROXY } from '@/lib/apiClient';
import { storage } from '#imports';
import { levelUpInfo, formatSubjectsData, getLevelUpPrediction } from '@/utils/scripts/wanikani';

const FASTEST_LEVEL_UP_REFRESH_MS = 5 * 60 * 1000;
import {
	loadSchoolKanjiMaps,
	getSchoolKanjiMapsSync,
	clearSchoolProgressSnapshots,
} from '@/utils/scripts/schoolKanji';
// kanji and words (JLPT / Jōyō labels)
import {
	buildVocabByJlpt,
	buildVocabByJoyo,
	enrichOneWithSchoolGrades as enrichSubjectWithSchoolGrades,
	enrichWithSchoolGrades as enrichSubjectsWithSchoolGrades,
} from '@/utils/scripts/vocabSchoolGrades';
import {
	buildJapaneseKanji,
	buildKanjiByJlpt,
	buildKanjiByJoyo,
} from '@/utils/highlight/schoolGradeHighlight';
import { groupByType } from '@/utils/scripts/common';
import {
	getAllCacheLevels,
	getMemoryHydrateLevels,
} from '@/utils/scripts/subjectCache';
import { useSettingsStore } from '@/stores/settings';
import {
	createEmptyKanjiByStage,
	createEmptyVocabByStage,
	srsStageKeyFromSubject,
} from '@/utils/highlight/srsStageHighlight';
import { normalizeLevelsStats, type LevelsStats } from '@/utils/scripts/levelStats';
import { getRelatedSubjectIds, ensureSubjectReviewStats } from '@/utils/scripts/subjectDetailsPopup';
import { isInitialSyncLocked, SYNC_PROGRESS_KEY } from '@/utils/scripts/initialDataSync';
import { inflectionsOf, writeHighlightDataIfChanged } from '@/utils/scripts/highlightDataSync';
import { clearAccoladeSnapshots } from '@/utils/scripts/accolades';
import { clearDailyActivity } from '@/utils/scripts/dailyActivity';
import { clearFriends } from '@/utils/scripts/friends';
import { clearNotifications } from '@/utils/scripts/notifications';
import { clearMilestones } from '@/utils/scripts/milestones';
import { clearFeatureNotices } from '@/utils/scripts/featureNotices';

type SummaryState = {
	lessons: Array<{ subject_id: number }>;
	reviews: Array<{ subject_id: number }>;
	nextReviews: Record<string, unknown> | null;
};

const BACKGROUND_SYNC_OPTIONS = { includeAssignments: false, includeReviews: false };
const LEVEL_PROGRESS_SNAPSHOT_KEY = 'levelProgressSnapshot';
/** a picture chosen on WaniKani's settings page, waiting to be used (see applyAvatarFromWanikani) */
const AVATAR_FROM_WANIKANI_KEY = 'local:avatarFromWanikani';
let stopAvatarWatch: (() => void) | null = null;
/** following the background's first sync (followBackgroundSync) */
let stopFollowingSync: (() => void) | null = null;

export type LevelCacheOverviewEntry = {
	level: number;
	cached: boolean;
	subjectCount: number;
	lastLoaded: string | null;
	cacheExpires: string | null;
};

/** a dashboard cache read in progress: calls at the same time share it (loadDashboardFromCache) */
let dashboardCacheLoad: Promise<void> | null = null;
let lastDashboardCacheRead = 0;
/** a cache read this recent is what's in memory still: not read again */
const DASHBOARD_CACHE_FRESH_MS = 60 * 1000;

/** Same assignments? Their count and latest change (any change makes that one the latest). */
function assignmentsKey(assignments: Array<any> | null | undefined): string {
	if (!assignments?.length) return '';
	let latest = '';
	for (const assignment of assignments) {
		const updated = assignment?.data_updated_at ?? '';
		if (updated > latest) latest = updated;
	}
	return `${assignments.length}:${latest}`;
}

export const useWKStore = defineStore('wk', {
	state: () => ({
		loading: false,
		isLoggedIn: false,
		subjectsListScroll: 0,
		allSubjectsLoaded: false,
		allSubjects: [] as Array<any>,
		/**
		 * allSubjects holds every cached level (read from the cache in one go). allSubjectsLoaded
		 * only says the cache is complete: subjects merged in before (the dashboard, a level)
		 * make a partial list until then.
		 */
		allSubjectsInMemory: false,
		/** current level's fastest possible level up (calendars mark the day) */
		fastestLevelUp: null as null | { level: number; at: number; lockedKanji: number },
		_fastestLevelUpAt: 0,
		assignments: [] as Array<any>,
		userAvatar: '',
		userInfo: {} as any,
		levelProgressionInfo: {} as any,
		summary: {
			lessons: [],
			reviews: [],
			nextReviews: null,
		} as SummaryState,
		levelsInProgress: [] as Array<any>,
		syncProgress: {
			loaded: 0,
			total: 0,
			label: '',
		},
		activeApiKey: null as string | null,
		_lastDashboardRefresh: 0,
		_lastHighlightSync: 0,
		_highlightSyncInFlight: false,
		_rebuildLevelsTimer: null as ReturnType<typeof setTimeout> | null,
		_eventsRegistered: false,
		_subjectsHydratedLevel: null as number | null,
		awaitingHighlightChoice: false,
		initialSyncComplete: false,
		initialSyncStarted: false,
		syncInProgress: false,
		levelCacheOverview: [] as LevelCacheOverviewEntry[],
		reloadingLevel: null as number | null,
		rateLimitNotice: null as { endpoint: string; retryAt: number } | null,
		levelsStats: null as LevelsStats | null,
		bootstrapping: true,
		_needsStartupSync: false,
		/** The routine "fetch the latest assignments" refresh is running. */
		dashboardRefreshing: false,
		/** When that refresh last finished in this popup session (0 = not yet). */
		dashboardRefreshedAt: 0,
	}),

	getters: {
		// getWKManager() isn't reactive, so a plain getter would be cached forever and keep
		// handing out the manager of a previous login. Depend on the active key instead.
		manager(state) {
			void state.activeApiKey;
			return getWKManager();
		},
		activeApiKeySuffix(): string | null {
			if (!this.activeApiKey) return null;
			return this.activeApiKey.slice(-8);
		},
		showLoadingScreen(): boolean {
			if (this.awaitingHighlightChoice || this.bootstrapping) return false;
			return this.loading
				|| (this.isLoggedIn && !this.initialSyncComplete && !this.initialSyncStarted);
		},
		showSyncToast(): boolean {
			if (this.awaitingHighlightChoice) return false;
			return this.isLoggedIn
				&& !this.initialSyncComplete
				&& this.initialSyncStarted
				&& !this.showLoadingScreen;
		},
		lessonsCount(): number {
			return this.summary.lessons?.length ?? 0;
		},
		reviewsCount(): number {
			return this.summary.reviews?.length ?? 0;
		},
	},

	actions: {
		async init(options?: { bootstrap?: boolean }) {
			if (options?.bootstrap) this.bootstrapping = true;
			this._needsStartupSync = false;
			this.loading = false;

			try {
				const settings = useSettingsStore();
				if (!settings.loaded) await settings.init();

				const [res] = await Promise.all([
					storage.getItems(['sync:apiKey', 'sync:proxyServer']),
					this.loadInitialSyncFlags(),
				]);
				const storedKey = res.find(item => item.key === 'sync:apiKey')?.value;
				const storedProxy = res.find(item => item.key === 'sync:proxyServer')?.value;

				if (!storedKey || !storedProxy) {
					this.loading = false;
					return;
				}

				this.activeApiKey = storedKey;
				this.isLoggedIn = true;
				this.allSubjectsLoaded = false;
			this.allSubjectsInMemory = false;

				// Deterministic gate for the first-boot highlight setup screen. Set before
				// the sync-scope decision so highlighting is always chosen first.
				this.awaitingHighlightChoice = !settings.settings.highlighter?.initial_choice_made;

				const wkManager = getWKManager(storedKey, storedProxy);
				if (!wkManager) {
					this.loading = false;
					return;
				}

				this.setupEventHandlers(wkManager);

				const cachedUser = await wkManager.storage.loadUserFromCache();
				if (cachedUser) {
					this.userInfo = cachedUser;
					if (cachedUser.avatar) this.userAvatar = cachedUser.avatar;
				}
				// a picture chosen on WaniKani's settings page meanwhile (or while this is open)
				await this.applyAvatarFromWanikani();
				if (!stopAvatarWatch) {
					stopAvatarWatch = storage.watch<any>(AVATAR_FROM_WANIKANI_KEY, chosen => {
						if (chosen) void this.applyAvatarFromWanikani(chosen);
					});
				}

				await this.loadDashboardFromCache();

				const cachedLevels = localStorage.getItem('levelsInProgress');
				if (cachedLevels) this.levelsInProgress = JSON.parse(cachedLevels);
				this.loadLevelProgressSnapshot(cachedUser?.level);

				let userInfo = cachedUser;
				if (userInfo) {
					// Background refresh only — avoid blocking startup on /user when cache exists.
					wkManager.getUserInfo(({ data }: { data: any }) => {
						if (!data) return;
						this.userInfo = data;
						if (data.avatar) this.userAvatar = data.avatar;
					});
				} else {
					userInfo = await wkManager.getUserInfo(null);
					if (userInfo) {
						this.userInfo = userInfo;
						if (userInfo.avatar) this.userAvatar = userInfo.avatar;
					}
				}

				const level = userInfo?.level;

				if (this.awaitingHighlightChoice) {
					this.loading = false;
					return;
				}

				if (this.initialSyncComplete || this.initialSyncStarted) {
					this.loading = false;
					await this.completeStartup(wkManager, level);
					return;
				}

				// First full sync — mount the UI first, then show the loading screen.
				this._needsStartupSync = true;
			} finally {
				if (options?.bootstrap) this.bootstrapping = false;
			}
		},

		/** Run the first full sync after the popup UI has mounted. */
		async continueStartupIfNeeded() {
			if (!this._needsStartupSync) return;
			this._needsStartupSync = false;

			const wkManager = getWKManager();
			if (!wkManager || this.awaitingHighlightChoice || !this.isLoggedIn) return;

			this.loading = true;
			await this.completeStartup(wkManager, this.userInfo?.level);
		},

		/** Called after the first-boot highlight setup screen is confirmed. */
		async beginStartupSync() {
			const wkManager = getWKManager();
			if (!wkManager) {
				this.loading = false;
				return;
			}

			this.loading = true;
			await this.completeStartup(wkManager, this.userInfo?.level);
		},

		async loadInitialSyncFlags() {
			const [syncComplete, syncStarted, legacyFirstLoad] = await Promise.all([
				storage.getItem<boolean>('local:initialSyncComplete'),
				storage.getItem<boolean>('local:initialSyncStarted'),
				storage.getItem<boolean>('local:firstLoadDone'),
			]);

			this.initialSyncComplete = syncComplete === true;
			this.initialSyncStarted = syncStarted === true || legacyFirstLoad === true;

			if (legacyFirstLoad && !syncStarted) {
				await storage.setItem('local:initialSyncStarted', true);
			}
		},

		async completeStartup(
			wkManager: NonNullable<ReturnType<typeof getWKManager>>,
			userLevel: number | undefined,
		) {
			if (this.initialSyncComplete) {
				this.allSubjectsLoaded = true;
				this.loading = false;
				void this.hydrateAllSubjectsFromCache(getMemoryHydrateLevels(userLevel));
				this.refreshDashboard(false);
				void this.syncMissingLevelsInBackground(wkManager, userLevel);
				return;
			}

			if (!this.initialSyncStarted) {
				if (await isInitialSyncLocked()) {
					this.initialSyncStarted = true;
					this.loading = false;
					this.syncInProgress = true;
					await this.loadDashboardFromCache();
					this.followBackgroundSync(userLevel);
					return;
				}

				this.syncProgress = { loaded: 0, total: 2, label: 'dashboard' };
				await wkManager.getSummary(null);
				this.syncProgress = { loaded: 1, total: 2, label: 'dashboard' };
				await wkManager.getAssignments(null);
				await this.loadDashboardFromCache();
				this._lastDashboardRefresh = Date.now();
				this.dashboardRefreshedAt = Date.now();
				this.syncProgress = { loaded: 2, total: 2, label: 'dashboard' };

				await storage.setItem('local:initialSyncStarted', true);
				this.initialSyncStarted = true;

				await this.runInitialSubjectSync(wkManager, userLevel);
				return;
			}

			// User closed the popup during the first full sync — resume with a toast.
			this.loading = false;
			this.allSubjectsLoaded = true;
			this.syncInProgress = true;
			await this.loadDashboardFromCache();
			this.refreshDashboard(false);
			void this.runInitialSubjectSync(wkManager, userLevel);
		},

		async getMissingLevels(
			wkManager: NonNullable<ReturnType<typeof getWKManager>>,
		): Promise<number[]> {
			const missing: number[] = [];
			for (const level of getAllCacheLevels()) {
				const ids = await wkManager.storage.getIdsByLevel([level]);
				if (!ids.length) missing.push(level);
			}
			return missing;
		},

		async runInitialSubjectSync(
			wkManager: NonNullable<ReturnType<typeof getWKManager>>,
			userLevel?: number,
		) {
			if (await isInitialSyncLocked()) {
				this.syncInProgress = true;
				this.loading = false;
				this.followBackgroundSync(userLevel);
				return;
			}

			this.syncInProgress = true;
			try {
				// subjects kept from before (logged out, or another account): only what's missing
				const missing = await this.getMissingLevels(wkManager);
				if (missing.length) {
					await this.syncSubjectLevels(wkManager, missing, userLevel);
				} else {
					await this.rebuildLevelsInProgress();
				}
				await this.finishInitialSync(wkManager, userLevel);
			} catch {
				// Leave flags unset so the toast resumes on the next popup open.
			} finally {
				this.syncInProgress = false;
			}
		},

		/**
		 * The first sync runs in the background (the popup was closed during it): its toast follows
		 * the background's progress, and once it's done the popup finishes as after its own sync.
		 */
		followBackgroundSync(userLevel?: number) {
			stopFollowingSync?.();
			const show = (progress: { loaded: number; total: number } | null) => {
				if (progress?.total) this.syncProgress = { loaded: progress.loaded, total: progress.total, label: 'subjects' };
			};
			void storage.getItem<{ loaded: number; total: number }>(SYNC_PROGRESS_KEY).then(show);
			const stopProgress = storage.watch<{ loaded: number; total: number }>(SYNC_PROGRESS_KEY, show);
			const stopComplete = storage.watch<boolean>('local:initialSyncComplete', async complete => {
				if (!complete) return;
				stopFollowingSync?.();
				this.initialSyncComplete = true;
				this.allSubjectsLoaded = true;
				this.loading = false;
				this.syncInProgress = false;
				this.syncProgress = { loaded: 0, total: 0, label: '' };
				await this.hydrateAllSubjectsFromCache(getMemoryHydrateLevels(userLevel ?? this.userInfo?.level));
				await this.rebuildLevelsInProgress();
				this.refreshDashboard(true);
			});
			// the background stopped without finishing (an error, or cut off: its lock went stale):
			// this popup carries on from there
			const takeOver = async () => {
				if (await isInitialSyncLocked() || await storage.getItem<boolean>('local:initialSyncComplete')) return;
				stopFollowingSync?.();
				const wkManager = getWKManager();
				if (!wkManager) return;
				await this.runInitialSubjectSync(wkManager, userLevel);
				// the progress too (the background's run may not have got to it)
				this.refreshDashboard(true);
			};
			const stopLock = storage.watch<number>('local:initialSyncLock', () => void takeOver());
			const staleCheck = setInterval(() => void takeOver(), 15_000);
			stopFollowingSync = () => {
				stopProgress();
				stopComplete();
				stopLock();
				clearInterval(staleCheck);
				stopFollowingSync = null;
			};
		},

		async finishInitialSync(
			wkManager: NonNullable<ReturnType<typeof getWKManager>>,
			userLevel?: number,
		) {
			await storage.setItem('local:initialSyncComplete', true);
			await storage.removeItem('local:firstLoadDone');
			this.initialSyncComplete = true;
			this.allSubjectsLoaded = true;
			this.loading = false;
			this.syncInProgress = false;
			await this.hydrateAllSubjectsFromCache(getMemoryHydrateLevels(userLevel));
		},

		async hydrateAllSubjectsFromCache(levels: number[]) {
			const wkManager = getWKManager();
			if (!wkManager || !levels.length) return;

			const ids = await wkManager.storage.getIdsByLevel(levels);
			if (!ids.length) return;

			const subjects = await wkManager.readSubjectsById(ids);
			this.allSubjects = enrichSubjectsWithSchoolGrades(formatSubjectsData(subjects));
			this._subjectsHydratedLevel = this.userInfo?.level ?? null;
			// every level asked for (all of them) is in memory now
			this.allSubjectsInMemory = levels.length >= getAllCacheLevels().length;

			const currentLevel = this.userInfo?.level;
			if (currentLevel) {
				const atLevel = subjects.filter((subject: any) => subject.level === currentLevel);
				if (atLevel.length) {
					this.setLevelProgressionInfo(levelUpInfo(atLevel), currentLevel);
				}
			}

			await this.rebuildLevelsInProgress();
		},

		/** Current-level progress, saved so Home's hero shows it before all subjects load. */
		setLevelProgressionInfo(info: any, level?: number | null) {
			this.levelProgressionInfo = info;
			if (!info?.progress || !level) return;
			try {
				localStorage.setItem(LEVEL_PROGRESS_SNAPSHOT_KEY, JSON.stringify({ level, progress: info.progress }));
			} catch {
				// the snapshot is only a speed-up
			}
		},

		loadLevelProgressSnapshot(level?: number | null) {
			if (this.levelProgressionInfo?.progress || !level) return;
			try {
				const snapshot = JSON.parse(localStorage.getItem(LEVEL_PROGRESS_SNAPSHOT_KEY) || 'null');
				// a snapshot from a previous level would be wrong after leveling up
				if (snapshot?.level === level && snapshot.progress) {
					this.levelProgressionInfo = { progress: snapshot.progress };
				}
			} catch {
				// ignore a corrupt snapshot
			}
		},

		async getRandomSubjectContext() {
			if (!this.assignments.length) {
				await this.loadDashboardFromCache();
			}

			const level = this.userInfo?.level;
			const needsHydrate = !this.allSubjects.length
				|| this._subjectsHydratedLevel !== level;

			if (needsHydrate && level) {
				const wkManager = getWKManager();
				if (wkManager) {
					await this.hydrateAllSubjectsFromCache(getMemoryHydrateLevels(level));
				}
			}

			return {
				allSubjects: this.allSubjects,
				assignments: this.assignments,
				summary: this.summary,
			};
		},

		syncMissingLevelsInBackground(
			wkManager: NonNullable<ReturnType<typeof getWKManager>>,
			userLevel?: number,
		) {
			void this.getMissingLevels(wkManager).then(async missing => {
				if (!missing.length) return;
				this.syncInProgress = true;
				try {
					await this.syncSubjectLevels(wkManager, missing, userLevel ?? this.userInfo?.level);
				} finally {
					this.syncInProgress = false;
				}
			});
		},

		/** Sync materials for the selected scope — shown on the loading screen. */
		async syncSubjectLevels(
			wkManager: NonNullable<ReturnType<typeof getWKManager>>,
			levels: number[],
			userLevel?: number,
		) {
			if (!levels.length) return;

			this.syncProgress = { loaded: 0, total: levels.length, label: 'subjects' };

			await wkManager.syncSubjectsByLevels(
				levels,
				(_lvl: number, index: number, total: number) => {
					this.syncProgress = { loaded: index, total, label: 'subjects' };
				},
				BACKGROUND_SYNC_OPTIONS,
			);

			const level = userLevel ?? this.userInfo?.level;
			if (level) {
				await this.hydrateAllSubjectsFromCache(getMemoryHydrateLevels(level));
			}

			if (this._rebuildLevelsTimer) clearTimeout(this._rebuildLevelsTimer);
			this._rebuildLevelsTimer = null;
			await this.rebuildLevelsInProgress();

			this.syncProgress = { loaded: levels.length, total: levels.length, label: 'subjects' };
		},

		async refreshLevelCacheOverview() {
			const wkManager = getWKManager();
			if (!wkManager) {
				this.levelCacheOverview = [];
				return [];
			}

			const overview = await wkManager.getLevelCacheOverview();
			this.levelCacheOverview = overview;
			return overview;
		},

		async forceReloadLevel(level: number) {
			const wkManager = getWKManager();
			if (!wkManager || !Number.isFinite(level)) return;

			this.reloadingLevel = level;
			try {
				await wkManager.forceUpdateMaterialsByLevel(level);
				const subjects = await wkManager.getSubjectsByLevel(level, null);
				if (subjects?.length) this.mergeSubjects(subjects);
				await this.refreshLevelCacheOverview();
			} finally {
				this.reloadingLevel = null;
			}
		},

		async syncMissingLevels() {
			const wkManager = getWKManager();
			if (!wkManager) return;

			const missing = await this.getMissingLevels(wkManager);
			if (!missing.length) return;

			this.syncInProgress = true;
			try {
				await this.syncSubjectLevels(wkManager, missing, this.userInfo?.level);
			} finally {
				this.syncInProgress = false;
			}
		},

		setupEventHandlers(wkManager: NonNullable<ReturnType<typeof getWKManager>>) {
			if (this._eventsRegistered) return;
			this._eventsRegistered = true;

			wkManager.events.on('update:user', (user: any) => {
				if (!user) return;
				this.userInfo = user;
				if (user.avatar) this.userAvatar = user.avatar;
			});

			wkManager.events.on('update:avatar', (avatar: string) => {
				if (avatar) this.userAvatar = avatar;
			});

			wkManager.events.on('get:summary', ({ data }: { data: SummaryState }) => {
				if (data) this.summary = data;
			});

			wkManager.events.on('get:assignments', ({ data, context }: { data: Array<any>; context?: { type?: string | null; srsStages?: number[] } }) => {
				// Partial fetches (by SRS stage or type) must not replace dashboard assignments.
				if (context?.srsStages?.length || context?.type) return;
				if (data?.length) {
					this.assignments = data;
					this.scheduleRebuildLevelsInProgress();
				}
			});

			wkManager.events.on('get:subjects', ({ data, context }: { data: Array<any>; context?: { levels?: number[] } }) => {
				if (!data?.length || !context?.levels?.length) return;
				this.mergeSubjects(data);

				const currentLevel = this.userInfo?.level;
				if (context.levels.length === 1 && context.levels[0] === currentLevel) {
					this.setLevelProgressionInfo(levelUpInfo(data), currentLevel);
				}
			});

			wkManager.events.on('error:rate-limit', ({ endpoint, data }: { endpoint: string; data: number }) => {
				const retryInSeconds = Math.max(1, Math.ceil(typeof data === 'number' ? data : 3));
				this.showRateLimitNotice(endpoint, retryInSeconds);
			});

			wkManager.events.on('get:levelProgressions', ({ data }: { data: LevelsStats | null }) => {
				if (data) this.levelsStats = normalizeLevelsStats(data);
			});
		},

		/**
		 * The picture chosen on WaniKani's settings page (utils/highlight/avatarHandoff.ts), when it's
		 * this account's: shown now, and kept as the API manager's own (no need to read the profile
		 * page for it). Used once.
		 */
		async applyAvatarFromWanikani(chosen?: any) {
			const data = chosen ?? await storage.getItem<any>(AVATAR_FROM_WANIKANI_KEY);
			const username = String(this.userInfo?.username ?? '');
			if (!data?.image || !username || String(data.username ?? '').toLowerCase() !== username.toLowerCase()) return;
			this.userAvatar = data.image;
			try {
				// the API manager's cache (its StorageManager's keys): read back as the user's avatar
				localStorage.setItem('wanikani_api_manager_user_avatar', data.image);
				localStorage.setItem('wanikani_api_manager_user_avatar_fetched_at', String(Date.now()));
			} catch {
				// shown anyway; read again from the profile page later
			}
			await storage.removeItem(AVATAR_FROM_WANIKANI_KEY);
		},

		showRateLimitNotice(endpoint: string, retryInSeconds: number) {
			const retryAt = Date.now() + retryInSeconds * 1000;
			if (this.rateLimitNotice) {
				this.rateLimitNotice = {
					endpoint,
					retryAt: Math.max(this.rateLimitNotice.retryAt, retryAt),
				};
				return;
			}
			this.rateLimitNotice = { endpoint, retryAt };
		},

		dismissRateLimitNotice() {
			this.rateLimitNotice = null;
		},

		/** Read dashboard state from IndexedDB without network calls. */
		/**
		 * The dashboard's data from the cache. Only what changed is replaced: a new copy of the same
		 * assignments would recompute everything built on them (Home's calendar, tiles, JLPT /
		 * Jōyō…), which made coming back to Home lag. Calls at the same time share one read.
		 */
		loadDashboardFromCache(): Promise<void> {
			// read moments ago: what's in memory is it (refreshes update it directly)
			if (this.assignments.length && Date.now() - lastDashboardCacheRead < DASHBOARD_CACHE_FRESH_MS) {
				return Promise.resolve();
			}
			dashboardCacheLoad ??= this.readDashboardCache().finally(() => {
				lastDashboardCacheRead = Date.now();
				dashboardCacheLoad = null;
			});
			return dashboardCacheLoad;
		},

		async readDashboardCache() {
			const wkManager = getWKManager();
			if (!wkManager) return;

			const summary = wkManager.storage.getSummary();
			if (summary && JSON.stringify(summary) !== JSON.stringify(this.summary)) this.summary = summary;

			let changed = false;
			const assignments = await wkManager.storage.getAssignments();
			if (assignments?.length) {
				const key = assignmentsKey(assignments);
				if (key !== assignmentsKey(this.assignments)) {
					this.assignments = assignments;
					changed = true;
				}
			}

			const levelsStats = wkManager.storage.getLevelProgressions();
			if (levelsStats) {
				const normalized = normalizeLevelsStats(levelsStats);
				if (JSON.stringify(normalized) !== JSON.stringify(this.levelsStats)) {
					this.levelsStats = normalized;
					changed = true;
				}
			}

			// built from the two above: only when one changed (or never built)
			if (changed || !this.levelsInProgress.length) await this.rebuildLevelsInProgress();
		},

		/**
		 * Cache-first dashboard refresh. Network calls are throttled to once per DASHBOARD_REFRESH_MS.
		 * @param force Skip throttle (startup only).
		 */
		async refreshDashboard(force = false) {
			const wkManager = getWKManager();
			if (!wkManager) return;

			await this.loadDashboardFromCache();

			const now = Date.now();
			if (!force && this._lastDashboardRefresh && now - this._lastDashboardRefresh < DASHBOARD_REFRESH_MS) {
				return;
			}
			this._lastDashboardRefresh = now;

			wkManager.getSummary(({ data }: { data: SummaryState }) => {
				if (data) this.summary = data;
			});
			this.dashboardRefreshing = true;
			wkManager.getAssignments(null, ({ state, data }: { state: string; data: Array<any> }) => {
				if (state !== 'error' && data?.length) this.assignments = data;
				// first call is the cached copy; 'updated' / 'error' means the refresh is over
				if (state !== 'cached') {
					this.dashboardRefreshing = false;
					this.dashboardRefreshedAt = Date.now();
				}
			});
			this.refreshLevelProgressions();
		},

		refreshLevelProgressions() {
			const wkManager = getWKManager();
			if (!wkManager) return;

			wkManager.getLevelProgressions(({ data }: { data: LevelsStats | null }) => {
				if (data) this.levelsStats = normalizeLevelsStats(data);
			});
		},

		/**
		 * Fastest possible level up of the current level (see getLevelUpPrediction), for the
		 * calendars to mark. Recomputed at most every few minutes.
		 */
		async refreshFastestLevelUp(force = false) {
			const level = this.userInfo?.level;
			if (!level) return;
			const fresh = this.fastestLevelUp?.level === level
				&& Date.now() - this._fastestLevelUpAt < FASTEST_LEVEL_UP_REFRESH_MS;
			if (!force && fresh) return;
			this._fastestLevelUpAt = Date.now();

			const subjects = await this.fetchSubjectsForLevel(level);
			if (!subjects.length) return;
			// the latest assignments (the cached subjects' copies can be older)
			const assignmentById = new Map(this.assignments.map((assignment: any) => [assignment.subject_id, assignment]));
			const levelSubjects = subjects.map((subject: any) => ({
				...subject,
				assignment: assignmentById.get(subject.id) ?? subject.assignment ?? {},
			}));
			const levelById = new Map(this.allSubjects.map((subject: any) => [subject.id, subject.level]));
			const prediction = getLevelUpPrediction(levelSubjects, {
				assignmentOf: (id: number) => assignmentById.get(id),
				levelOf: (id: number) => levelById.get(id),
			});
			this.fastestLevelUp = prediction
				? { level, at: prediction.levelUpAt.getTime(), lockedKanji: prediction.lockedKanji }
				: null;
		},

		/** Cache-first level fetch for profile/search; refreshes stale levels on access. */
		async fetchSubjectsForLevel(level: number) {
			const wkManager = getWKManager();
			if (!wkManager) return [];

			const subjects = await wkManager.getSubjectsByLevel(level, null);
			if (subjects?.length) this.mergeSubjects(subjects);
			return subjects ?? [];
		},

		/** Cache-first subject lookup for the subject detail page (no network unless missing). */
		async getSubjectById(id: number) {
			const wkManager = getWKManager();
			if (!wkManager || !Number.isFinite(id)) return null;

			let subject = (await wkManager.readSubjectsById(id))?.[0] ?? null;
			if (!subject) {
				const subjects = await wkManager.getSubjectsById(id, () => {});
				subject = subjects?.[0] ?? null;
			}

			if (!subject) return null;

			return enrichSubjectWithSchoolGrades(
				await ensureSubjectReviewStats(wkManager, subject),
			);
		},

		/** Subject plus related radicals/kanji/vocab for the details cards sections. */
		async getSubjectWithRelated(id: number) {
			const subject = await this.getSubjectById(id);
			if (!subject) return null;

			const wkManager = getWKManager();
			if (!wkManager) return { subject, related: {} as Record<number, any> };

			const relatedIds = getRelatedSubjectIds(subject).filter(relatedId => relatedId !== id);
			if (!relatedIds.length) return { subject, related: {} as Record<number, any> };

			let relatedList = await wkManager.readSubjectsById(relatedIds);
			const missingIds = relatedIds.filter(
				relatedId => !relatedList?.some(entry => entry?.id === relatedId),
			);
			if (missingIds.length) {
				const fetched = await wkManager.getSubjectsById(missingIds, () => {});
				if (fetched?.length) {
					this.mergeSubjects(fetched);
					relatedList = [...(relatedList ?? []), ...fetched];
				}
			}

			const related: Record<number, any> = {};
			for (const entry of relatedList ?? []) {
				if (entry?.id != null) related[entry.id] = entry;
			}

			return { subject, related };
		},

		/**
		 * Subjects a list needs but that aren't cached (e.g. added by WaniKani to a level
		 * that was already synced): read from cache, fetch the rest, and keep them.
		 */
		async resolveSubjects(ids: number[]) {
			const wkManager = getWKManager();
			const unique = [...new Set(ids.filter(id => Number.isFinite(id)))];
			if (!wkManager || !unique.length) return [];

			let subjects: Array<any> = (await wkManager.readSubjectsById(unique)) ?? [];
			const found = new Set(subjects.map((subject: any) => subject.id));
			const missing = unique.filter(id => !found.has(id));			if (missing.length) {
				try {
					const fetched = await wkManager.getSubjectsById(missing, null);
					if (fetched?.length) subjects = [...subjects, ...fetched];
				} catch {
					// show what we have
				}
			}

			if (subjects.length) this.mergeSubjects(subjects);
			return enrichSubjectsWithSchoolGrades(formatSubjectsData(subjects));
		},

		/**
		 * Cached subjects without an assignment (locked), from the lightweight level index,
		 * so it's cheap even before all subjects are hydrated.
		 */
		/** Every subject WaniKani has (from the cached level index; the same for every user). */
		async countAllSubjects(): Promise<number> {
			const wkManager = getWKManager();
			if (!wkManager) return 0;
			try {
				return (await wkManager.storage.getSubjectIdLevelMap()).size;
			} catch {
				return 0;
			}
		},

		async countLockedSubjects(): Promise<number> {
			const wkManager = getWKManager();
			if (!wkManager) return 0;
			try {
				const levelBySubjectId = await wkManager.storage.getSubjectIdLevelMap();
				const assigned = new Set(this.assignments.map((assignment: any) => assignment.subject_id));
				let locked = 0;
				for (const id of levelBySubjectId.keys()) {
					if (!assigned.has(id)) locked += 1;
				}
				return locked;
			} catch {
				return 0;
			}
		},

		/** Resolve highlighted characters/words (from a page) into full subjects. */
		async getHighlightedSubjects(items: Array<{ value: string; type?: string }>) {
			const wkManager = getWKManager();
			if (!wkManager || !items?.length) return [];

			const values = Array.from(new Set(items.map(item => item.value).filter(Boolean)));
			if (!values.length) return [];

			let materials: Array<any> = [];
			try {
				materials = await wkManager.storage.getMaterialsByCharacterValues(values);
			} catch {
				materials = [];
			}
			if (!materials.length) return [];

			const typeMatches = (materialType: string, wanted?: string) =>
				!wanted
				|| materialType === wanted
				|| (wanted === 'vocabulary' && materialType === 'kana_vocabulary');

			const byChars = new Map<string, Array<any>>();
			for (const material of materials) {
				const list = byChars.get(material.characters) ?? [];
				list.push(material);
				byChars.set(material.characters, list);
			}

			const ids = new Set<number>();
			for (const item of items) {
				const candidates = byChars.get(item.value);
				if (!candidates?.length) continue;
				const match = candidates.find(m => typeMatches(m.type, item.type)) ?? candidates[0];
				ids.add(match.id);
			}
			if (!ids.size) return [];

			const subjects = await wkManager.readSubjectsById(Array.from(ids));
			return formatSubjectsData(subjects);
		},

		scheduleRebuildLevelsInProgress() {
			if (this._rebuildLevelsTimer) clearTimeout(this._rebuildLevelsTimer);
			this._rebuildLevelsTimer = setTimeout(() => {
				this._rebuildLevelsTimer = null;
				this.rebuildLevelsInProgress();
			}, 250);
		},

		mergeSubjects(data: Array<any>) {
			const formatted = enrichSubjectsWithSchoolGrades(formatSubjectsData(data));
			const byId = new Map(this.allSubjects.map(item => [item.id, item]));
			// The same data again is common (cache reads, the get:subjects event after a fetch):
			// replacing allSubjects then would recompute everything that depends on it for nothing.
			const changed = formatted.filter(item => {
				const current = byId.get(item.id);
				return !current || JSON.stringify(toRaw(current)) !== JSON.stringify(item);
			});
			if (!changed.length) return;
			changed.forEach(item => byId.set(item.id, item));
			this.allSubjects = enrichSubjectsWithSchoolGrades(Array.from(byId.values()));
			this.scheduleRebuildLevelsInProgress();
		},

		async refreshSchoolGrades() {
			await loadSchoolKanjiMaps();
			if (!this.allSubjects.length) {
				void this.syncHighlightData(true);
				return;
			}
			for (const subject of this.allSubjects) {
				delete subject.jlpt;
				delete subject.joyo;
			}
			enrichSubjectsWithSchoolGrades(this.allSubjects);
			void this.syncHighlightData(true);
		},

		async rebuildLevelsInProgress() {
			const wkManager = getWKManager();
			if (!wkManager) return;

			const assignments = this.assignments.length
				? this.assignments
				: await wkManager.storage.getAssignments();
			if (!assignments?.length) return;

			const levelBySubjectId = await wkManager.storage.getSubjectIdLevelMap();

			const byLevel = new Map<number, Array<any>>();
			for (const assignment of assignments) {
				if (assignment.hidden) continue;

				const level = levelBySubjectId.get(assignment.subject_id);
				if (level == null) continue;

				if (!byLevel.has(level)) byLevel.set(level, []);
				byLevel.get(level)!.push({
					id: assignment.subject_id,
					type: assignment.subject_type,
					level,
					subject_type: assignment.subject_type,
					srs_stage: assignment.srs_stage,
					assignment: {
						srs_stage: assignment.srs_stage,
						passed_at: assignment.passed_at,
						hidden: assignment.hidden,
					},
				});
			}

			const inProgress = [...byLevel.entries()]
				.filter(([, items]) => items.some(item => item.assignment?.passed_at == null));

			// Locked subjects have no assignment yet, but they are part of the level:
			// add them (from cached materials) so the bars show the whole level.
			const inProgressLevels = inProgress.map(([level]) => level);
			if (inProgressLevels.length) {
				try {
					const assigned = new Set(assignments.map((assignment: any) => assignment.subject_id));
					// every subject in memory (the usual, after startup): no database read (it took
					// most of a second, each time Home opened)
					const levelSet = new Set(inProgressLevels);
					const materials = this.allSubjectsInMemory
						? this.allSubjects.filter((subject: any) => levelSet.has(subject.level))
						: await wkManager.storage.getMaterialsByLevel(inProgressLevels);
					for (const material of materials ?? []) {
						if (assigned.has(material.id) || material.hidden_at) continue;
						byLevel.get(material.level)?.push({
							id: material.id,
							type: material.type,
							level: material.level,
							subject_type: material.type,
							srs_stage: null,
							assignment: { srs_stage: null, passed_at: null, hidden: false },
						});
					}
				} catch {
					// keep the assignment-only bars
				}
			}

			this.levelsInProgress = inProgress
				.map(([level, items]) => ({
					level,
					items: groupByType(items),
				}))
				.sort((a, b) => a.level - b.level);

			if (this.levelsInProgress.length > 0) {
				localStorage.setItem('levelsInProgress', JSON.stringify(this.levelsInProgress));
			}

			void this.syncHighlightData();
		},

		/**
		 * Produce the learned / not-learned kanji sets consumed by the page
		 * highlighter content script and mirror them into extension storage.
		 * Throttled since it scans every cached kanji subject.
		 */
		async syncHighlightData(force = false) {
			const now = Date.now();
			if (!force && this._highlightSyncInFlight) return;
			if (!force && this._lastHighlightSync && now - this._lastHighlightSync < 30_000) return;

			this._highlightSyncInFlight = true;
			try {
				const wkManager = getWKManager();

				const readByType = async (types: string[]): Promise<Array<any>> => {
					if (!wkManager) return [];
					try {
						const idGroups = await Promise.all(
							types.map(type => wkManager.storage.getIdsByTypeAndLevel(type, getAllCacheLevels())),
						);
						const ids = idGroups.flat();
						return ids.length ? await wkManager.readSubjectsById(ids) : [];
					} catch {
						return [];
					}
				};

				const learnedAssignmentIds = new Set(
					this.assignments
						.filter(a => a.srs_stage != null && a.srs_stage >= 1)
						.map(a => a.subject_id),
				);

				const splitByLearned = (subjects: Array<any>) => {
					const learned = new Set<string>();
					const notLearned = new Set<string>();
					for (const subject of subjects) {
						const chars = subject.characters;
						if (!chars) continue;
						const srs = subject.assignment?.srs_stage;
						const isLearned = learnedAssignmentIds.has(subject.id) || (srs != null && srs >= 1);
						(isLearned ? learned : notLearned).add(chars);
					}
					return { learned, notLearned };
				};

				const splitBySrsStageKanji = (subjects: Array<any>) => {
					const byStage = createEmptyKanjiByStage();
					const charSets = Object.fromEntries(
						Object.keys(byStage).map(key => [key, new Set<string>()]),
					) as Record<string, Set<string>>;
					for (const subject of subjects) {
						const chars = subject.characters;
						if (!chars) continue;
						const key = srsStageKeyFromSubject(subject);
						for (const char of chars) charSets[key].add(char);
					}
					for (const key of Object.keys(byStage)) {
						byStage[key as keyof typeof byStage] = Array.from(charSets[key]).join('');
					}
					return byStage;
				};

				const splitBySrsStageVocab = (subjects: Array<any>) => {
					const byStage = createEmptyVocabByStage();
					for (const subject of subjects) {
						const chars = subject.characters;
						if (!chars) continue;
						const key = srsStageKeyFromSubject(subject);
						if (!byStage[key].includes(chars)) byStage[key].push(chars);
					}
					return byStage;
				};

				let kanjiSubjects = await readByType(['kanji']);
				if (!kanjiSubjects.length) {
					kanjiSubjects = this.allSubjects.filter(subject => subject.type === 'kanji');
				}

				let vocabSubjects = await readByType(['vocabulary', 'kana_vocabulary']);
				if (!vocabSubjects.length) {
					vocabSubjects = this.allSubjects.filter(
						subject => subject.type === 'vocabulary' || subject.type === 'kana_vocabulary',
					);
				}

				const kanji = splitByLearned(kanjiSubjects);
				const vocab = splitByLearned(vocabSubjects);
				const kanjiByStage = splitBySrsStageKanji(kanjiSubjects);
				const vocabByStage = splitBySrsStageVocab(vocabSubjects);
				const schoolMaps = getSchoolKanjiMapsSync();
				const kanjiByJlpt = buildKanjiByJlpt(schoolMaps);
				const kanjiByJoyo = buildKanjiByJoyo(schoolMaps);

				await writeHighlightDataIfChanged({
					kanji: {
						learned: Array.from(kanji.learned).join(''),
						notLearned: Array.from(kanji.notLearned).join(''),
						byStage: kanjiByStage,
						byJlpt: kanjiByJlpt,
						byJoyo: kanjiByJoyo,
						japanese: buildJapaneseKanji(schoolMaps),
					},
					vocabulary: {
						learned: Array.from(vocab.learned),
						notLearned: Array.from(vocab.notLearned),
						// how the verbs and adjectives conjugate (deinflect.ts): 話していました finds 話す
						inflections: inflectionsOf(vocabSubjects),
						byStage: vocabByStage,
						byJlpt: buildVocabByJlpt(vocabSubjects),
						byJoyo: buildVocabByJoyo(vocabSubjects, schoolMaps),
					},
					updatedAt: now,
				});
				this._lastHighlightSync = now;
			} finally {
				this._highlightSyncInFlight = false;
			}
		},

		async syncRemainingLevels(wkManager: NonNullable<ReturnType<typeof getWKManager>>) {
			const missing = await this.getMissingLevels(wkManager);
			if (!missing.length) return;
			return this.syncSubjectLevels(wkManager, missing, this.userInfo?.level);
		},

		/**
		 * The account's data goes (its progress, info, the extension's per-account data); the
		 * subjects stay (WaniKani's content, the same for everyone): logging in again, as anyone,
		 * only fetches that account's progress.
		 */
		async logout() {
			const wkManager = getWKManager();
			if (wkManager) {
				await wkManager.clearUserData();
				wkManager.clearUserInfo();
			}
			resetWKManager();
			this.reset();
			// pages would otherwise keep highlighting with the previous account's progress
			await storage.removeItem('local:highlightData');
		},

		/**
		 * Another account (a Drive backup holding its key): logged out of this one (its data goes,
		 * the subjects stay), logged in with that key. The popup reloads into it, at `route`.
		 */
		async switchAccount(apiKey: string, route = '#/') {
			const proxy = (await storage.getItem<string>('sync:proxyServer')) || DEFAULT_PROXY;
			await this.logout();
			await storage.setItems([
				{ key: 'sync:apiKey', value: apiKey.trim() },
				{ key: 'sync:proxyServer', value: proxy },
			]);
			location.hash = route;
			location.reload();
		},

		/**
		 * Settings → Data → Reset subject data: back to a clean state, as right after installing.
		 * Anything left from v1.5 (a migration that didn't finish) goes, and the subjects are
		 * downloaded again; settings, the API key and the saved history stay.
		 */
		async clearSubjectsData() {
			await removeLegacyKeys();
			await deleteLegacyIndexedDb();
			const wkManager = getWKManager();
			if (wkManager) {
				await wkManager.clearDatabase();
			}

			await storage.removeItem('local:initialSyncComplete');
			await storage.removeItem('local:initialSyncStarted');
			await storage.removeItem('local:firstLoadDone');

			this.allSubjects = [];
			this.assignments = [];
			this.allSubjectsLoaded = false;
			this.allSubjectsInMemory = false;
			this.initialSyncComplete = false;
			this.initialSyncStarted = false;
			this.syncInProgress = false;
			this.levelsInProgress = [];
			this._subjectsHydratedLevel = null;
			this.levelCacheOverview = [];
			this.awaitingHighlightChoice = false;
			this.summary = { lessons: [], reviews: [], nextReviews: null };
			this.syncProgress = { loaded: 0, total: 0, label: '' };
			localStorage.removeItem('levelsInProgress');
			localStorage.removeItem('allSubjectsLoaded');
			clearSchoolProgressSnapshots();
			clearAccoladeSnapshots();
			this.loading = true;
			await this.init();
			// init only marks the first sync as needed: the popup starts it when it opens, and it's
			// already open here (without this, the loading screen waited until the popup reopened)
			void this.continueStartupIfNeeded();
		},

		reset() {
			this.loading = true;
			this.isLoggedIn = false;
			this.allSubjects = [];
			this.assignments = [];
			this.allSubjectsLoaded = false;
			this.allSubjectsInMemory = false;
			this.levelsInProgress = [];
			this._subjectsHydratedLevel = null;
			this.awaitingHighlightChoice = false;
			this.initialSyncComplete = false;
			this.initialSyncStarted = false;
			this.syncInProgress = false;
			this.levelCacheOverview = [];
			this.reloadingLevel = null;
			this.summary = { lessons: [], reviews: [], nextReviews: null };
			this.syncProgress = { loaded: 0, total: 0, label: '' };
			this.activeApiKey = null;
			this._lastDashboardRefresh = 0;
			this.dashboardRefreshing = false;
			this.dashboardRefreshedAt = 0;
			localStorage.removeItem('progressSnapshot');
			if (this._rebuildLevelsTimer) clearTimeout(this._rebuildLevelsTimer);
			this._rebuildLevelsTimer = null;
			this._eventsRegistered = false;
			this.userInfo = {};
			this.userAvatar = '';
			// whose account the extension is (WaniKani's settings page checks it): nobody's now
			void storage.removeItem('local:accountUsername');
			this.levelProgressionInfo = {};
			this.fastestLevelUp = null;
			this._fastestLevelUpAt = 0;
			this.levelsStats = null;
			localStorage.removeItem('levelsInProgress');
			localStorage.removeItem(LEVEL_PROGRESS_SNAPSHOT_KEY);
			localStorage.removeItem('allSubjectsLoaded');
			clearSchoolProgressSnapshots();
			clearAccoladeSnapshots();
			storage.removeItem('sync:apiKey');
			storage.removeItem('sync:proxyServer');
			void clearDailyActivity();
			void clearFriends();
			void clearNotifications();
			void clearMilestones();
			// new features are announced again after the next login
			void clearFeatureNotices();
			storage.removeItem('local:initialSyncComplete');
			storage.removeItem('local:initialSyncStarted');
			storage.removeItem('local:firstLoadDone');
		},
	},
});
