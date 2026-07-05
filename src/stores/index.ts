import { defineStore } from 'pinia';
import { getWKManager, resetWKManager, DASHBOARD_REFRESH_MS } from '@/lib/apiClient';
import { storage } from '#imports';
import { levelUpInfo, formatSubjectsData } from '@/utils/scripts/wanikani';
import {
	enrichSubjectWithSchoolGrades,
	enrichSubjectsWithSchoolGrades,
	loadSchoolKanjiMaps,
	getSchoolKanjiMapsSync,
} from '@/utils/scripts/schoolKanji';
import {
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

type SummaryState = {
	lessons: Array<{ subject_id: number }>;
	reviews: Array<{ subject_id: number }>;
	nextReviews: Record<string, unknown> | null;
};

const BACKGROUND_SYNC_OPTIONS = { includeAssignments: false, includeReviews: false };

export type LevelCacheOverviewEntry = {
	level: number;
	cached: boolean;
	subjectCount: number;
	lastLoaded: string | null;
	cacheExpires: string | null;
};

export const useWKStore = defineStore('wk', {
	state: () => ({
		loading: false,
		isLoggedIn: false,
		subjectsListScroll: 0,
		allSubjectsLoaded: false,
		allSubjects: [] as Array<any>,
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
	}),

	getters: {
		manager: () => getWKManager(),
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

				await this.loadDashboardFromCache();

				const cachedLevels = localStorage.getItem('levelsInProgress');
				if (cachedLevels) this.levelsInProgress = JSON.parse(cachedLevels);

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
				this.syncProgress = { loaded: 0, total: 2, label: 'dashboard' };
				await wkManager.getSummary(null);
				this.syncProgress = { loaded: 1, total: 2, label: 'dashboard' };
				await wkManager.getAssignments(null);
				await this.loadDashboardFromCache();
				this._lastDashboardRefresh = Date.now();
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
			this.syncInProgress = true;
			try {
				const missing = await this.getMissingLevels(wkManager);
				const levels = missing.length ? missing : getAllCacheLevels();
				if (levels.length) {
					await this.syncSubjectLevels(wkManager, levels, userLevel);
				}
				await this.finishInitialSync(wkManager, userLevel);
			} catch {
				// Leave flags unset so the toast resumes on the next popup open.
			} finally {
				this.syncInProgress = false;
			}
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

			const currentLevel = this.userInfo?.level;
			if (currentLevel) {
				const kanjiAtLevel = subjects.filter(
					(subject: any) => subject.type === 'kanji'
						&& subject.level === currentLevel
						&& !subject.assignment?.hidden,
				);
				if (kanjiAtLevel.length) {
					this.levelProgressionInfo = levelUpInfo(kanjiAtLevel);
				}
			}

			await this.rebuildLevelsInProgress();
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
					this.levelProgressionInfo = levelUpInfo(
						data.filter(subject => subject.type === 'kanji' && !subject.assignment?.hidden)
					);
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
		async loadDashboardFromCache() {
			const wkManager = getWKManager();
			if (!wkManager) return;

			const summary = wkManager.storage.getSummary();
			if (summary) {
				this.summary = summary;
			}

			const assignments = await wkManager.storage.getAssignments();
			if (assignments?.length) this.assignments = assignments;

			const levelsStats = wkManager.storage.getLevelProgressions();
			if (levelsStats) this.levelsStats = normalizeLevelsStats(levelsStats);

			await this.rebuildLevelsInProgress();
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
			wkManager.getAssignments(null, ({ data }: { data: Array<any> }) => {
				if (data?.length) this.assignments = data;
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

		/** Resolve highlighted characters/words (from a page) into full subjects. */
		async getHighlightedSubjects(items: Array<{ value: string; type?: string }>) {
			const wkManager = getWKManager();
			if (!wkManager || !items?.length) return [];

			const values = Array.from(new Set(items.map(item => item.value).filter(Boolean)));
			if (!values.length) return [];

			let materials: Array<any> = [];
			try {
				materials = await wkManager.storage._getMaterialsByAnyOf('characters', values);
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
			const formatted = formatSubjectsData(data);
			const byId = new Map(this.allSubjects.map(item => [item.id, item]));
			formatted.forEach(item => byId.set(item.id, item));
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

			this.levelsInProgress = [...byLevel.entries()]
				.filter(([, items]) => items.some(item => item.assignment?.passed_at == null))
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

				await storage.setItem('local:highlightData', {
					kanji: {
						learned: Array.from(kanji.learned).join(''),
						notLearned: Array.from(kanji.notLearned).join(''),
						byStage: kanjiByStage,
						byJlpt: kanjiByJlpt,
						byJoyo: kanjiByJoyo,
					},
					vocabulary: {
						learned: Array.from(vocab.learned),
						notLearned: Array.from(vocab.notLearned),
						byStage: vocabByStage,
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

		async logout() {
			const wkManager = getWKManager();
			if (wkManager) {
				await wkManager.clearDatabase();
				wkManager.clearUserInfo();
			}
			resetWKManager();
			this.reset();
		},

		async clearSubjectsData() {
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
			this.loading = true;
			await this.init();
		},

		reset() {
			this.loading = true;
			this.isLoggedIn = false;
			this.allSubjects = [];
			this.assignments = [];
			this.allSubjectsLoaded = false;
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
			if (this._rebuildLevelsTimer) clearTimeout(this._rebuildLevelsTimer);
			this._rebuildLevelsTimer = null;
			this._eventsRegistered = false;
			this.userInfo = {};
			this.userAvatar = '';
			this.levelProgressionInfo = {};
			this.levelsStats = null;
			localStorage.removeItem('levelsInProgress');
			localStorage.removeItem('allSubjectsLoaded');
			storage.removeItem('sync:apiKey');
			storage.removeItem('sync:proxyServer');
			storage.removeItem('local:initialSyncComplete');
			storage.removeItem('local:initialSyncStarted');
			storage.removeItem('local:firstLoadDone');
		},
	},
});
