import { storage } from '#imports';
import { createWKManager } from '@/lib/apiClient';
import {
	CONTEXT_MENU_DEFAULT_TITLE,
	CONTEXT_MENU_ID,
	CONTEXT_MENU_SEARCH_STORAGE_KEY,
	formatContextMenuTitle,
} from '@/utils/scripts/contextMenuSearch';
import {
	badgeModeOf,
	formatBadgeCount,
	getBadgeBackgroundColor,
	getContrastTextColor,
	GLOBAL_BADGE_MODES,
	PAGE_LEVEL_BADGE_MODES,
	readingLevelColor,
} from '@/utils/scripts/extensionBadge';
import {
	clearBadgeSummary,
	isBadgeAlarm,
	onBadgeAlarm,
	refreshBadgeSummary,
	setupBadgeAlarm,
	updateGlobalBadge,
} from '@/utils/scripts/badgeStatus';
import { getRelatedSubjectIds, ensureSubjectReviewStats } from '@/utils/scripts/subjectDetailsPopup';
// kanji and words (JLPT / Jōyō labels)
import { enrichOneWithSchoolGrades as enrichSubjectWithSchoolGrades } from '@/utils/scripts/vocabSchoolGrades';
import { migrateFromV15IfNeeded } from '@/utils/scripts/migrateFromV15';
import { isInitialSyncLocked, runInitialDataSyncIfNeeded } from '@/utils/scripts/initialDataSync';
import { clearDailyActivity, syncDailyActivity } from '@/utils/scripts/dailyActivity';
import { autoBackUpToDrive, disconnectDrive, runDriveLogin } from '@/utils/scripts/driveBackup';
import { showBrowserNotification } from '@/utils/scripts/browserNotification';
import { lookupPitchAccents } from '@/utils/scripts/pitchAccent';
import { loadMnemonicImage } from '@/utils/scripts/mnemonicImages';
import { fetchTextDirectOrProxy, isWaniKaniPage } from '@/utils/scripts/wanikaniPages';
import { addFriend, clearFriends, DAILY_REFRESH_MS, OPEN_REFRESH_MS, refreshFriends } from '@/utils/scripts/friends';
import { API_KEY_FORMAT, clearPendingApiKey, setPendingApiKey, TOKENS_PAGE_URL } from '@/utils/scripts/pendingApiKey';
import { verifyApiKeyWithRequest } from '@/utils/scripts/apiKeyValidation';
import { clearNotifications } from '@/utils/scripts/notifications';
import { clearMilestones, noteLevel } from '@/utils/scripts/milestones';
import { pageHistorySize, pageKey, recordPage } from '@/utils/scripts/pageHistory';
import { MAX_SENTENCE_LENGTH, SENTENCE_EXCLUDED_SITES_KEY, sentencesPerPage } from '@/utils/scripts/pageSentences';
import { clearFeatureNotices } from '@/utils/scripts/featureNotices';
import {
  clearReviewAlerts,
  isReviewAlertsAlarm,
  onReviewAlertClicked,
  onReviewAlertsAlarm,
  setupReviewAlerts,
} from '@/utils/scripts/reviewAlerts';
import { isUpdateFromV1, maybeOpenUpgradeNotice } from '@/utils/scripts/upgradeNotice';
import {
  openBrowserSidePanel,
  SIDEPANEL_SUBJECT_KEY,
  type DetailsLocation,
  type SidePanelRequest,
} from '@/utils/scripts/sidePanel';

/** The first subject sync; done, today's activity is caught up (it waited for the sync). */
async function runFirstSync(): Promise<void> {
  if (await runInitialDataSyncIfNeeded()) await syncDailyActivityInBackground();
}

async function runStartupMigration(updatedFromV1 = false): Promise<void> {
  const result = await migrateFromV15IfNeeded();
  // updated from v1: What's new opens right away (not after the first sync, which takes minutes)
  if (updatedFromV1) await maybeOpenUpgradeNotice({ hadLegacyMigration: false, migratedApiKey: false, updatedFromV1 });
  await runFirstSync();
  await maybeOpenUpgradeNotice({
    hadLegacyMigration: result.hadLegacyData,
    migratedApiKey: result.migratedApiKey,
  });
}

async function setupContextMenu(): Promise<void> {
  await browser.contextMenus.remove(CONTEXT_MENU_ID).catch(() => {});
  await browser.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: CONTEXT_MENU_DEFAULT_TITLE,
    contexts: ['selection'],
  });
}

let bgManager: ReturnType<typeof createWKManager> | null = null;

async function getBgManager() {
  if (bgManager) return bgManager;
  const [apiKey, proxyServer] = await Promise.all([
    storage.getItem<string>('sync:apiKey'),
    storage.getItem<string>('sync:proxyServer'),
  ]);
  if (!apiKey) return null;
  bgManager = createWKManager({ apiKey, proxyServer: proxyServer || undefined });
  return bgManager;
}

/** Hourly, so "Today" / "Yesterday" stay right even when the popup isn't opened. */
const DAILY_ACTIVITY_ALARM = 'wkh:dailyActivity';

async function setupDailyActivityAlarm(): Promise<void> {
  // creating it again would restart the countdown each time the service worker wakes
  if (await browser.alarms.get(DAILY_ACTIVITY_ALARM)) return;
  await browser.alarms.create(DAILY_ACTIVITY_ALARM, { delayInMinutes: 1, periodInMinutes: 60 });
}

async function syncDailyActivityInBackground(): Promise<void> {
  // the first subject sync uses most of the API rate limit: wait for the next round
  if (await isInitialSyncLocked()) return;
  const manager = await getBgManager();
  if (manager) {
    await syncDailyActivity(manager);
    // a level-up while the popup is closed: in the notifications (the toast waits for the popup)
    const userInfo = await manager.getUserInfo(null).catch(() => null);
    if (userInfo?.level) await noteLevel(Number(userInfo.level));
  }
  // friends' profiles: once a day (not the API: WaniKani's public pages)
  await refreshFriends(DAILY_REFRESH_MS);
}

const API_KEY_BADGE_COLOR = '#30a46c';
const SEARCH_NOTIFICATION_PREFIX = 'wkh-search-';
const API_KEY_NOTIFICATION_PREFIX = 'wkh-apikey-';

/** The pending key is used: forget it, and the "KEY" badge (everywhere, and on its tab). */
async function clearApiKeyHandoff(): Promise<void> {
  const tabId = await clearPendingApiKey();
  await applyBadge('', getBadgeBackgroundColor());
  if (tabId != null) await browser.action.setBadgeText({ text: null as unknown as string, tabId }).catch(() => {});
  // the browser-wide badge (reviews…), if that's the choice
  await updateGlobalBadge();
  // its "API key received" notification, if still shown
  const shown = await browser.notifications.getAll().catch(() => ({}));
  for (const id of Object.keys(shown)) {
    if (id.startsWith(API_KEY_NOTIFICATION_PREFIX)) void browser.notifications.clear(id);
  }
}

async function applyBadge(
  text: string,
  backgroundColor: string,
  tabId?: number,
): Promise<void> {
  const textColor = getContrastTextColor(backgroundColor);
  const badgeText = text || '';
  const options = tabId == null ? {} : { tabId };

  await browser.action.setBadgeText({ text: badgeText, ...options });
  await browser.action.setBadgeBackgroundColor({ color: backgroundColor, ...options });
  await browser.action.setBadgeTextColor({ color: textColor, ...options });
}

export default defineBackground(() => {
  void setupContextMenu();
  void runStartupMigration();

  // Logging out / switching API key must not keep using the old manager.
  const resetBgManager = () => { bgManager = null; };
  storage.watch('sync:apiKey', async apiKey => {
    resetBgManager();
    // another key of the same account (WaniKani's tokens page, replaceApiKey): its data stays
    if (apiKey && (await storage.getItem<string>(SAME_ACCOUNT_KEY)) === apiKey) {
      await storage.removeItem(SAME_ACCOUNT_KEY);
      return;
    }
    void clearDailyActivity();
    void clearFriends();
    void clearNotifications();
    void clearMilestones();
    void clearReviewAlerts();
    void clearBadgeSummary();
    // logged out: the data above is gone, a backup now would save it emptied (logging in keeps
    // it: the login screen can connect Drive first, to restore from it)
    if (!apiKey) void disconnectDrive();
    // a new account (or the same, again) is told about new features again
    void clearFeatureNotices();
    // logged in: a key sent from WaniKani's page was used (or isn't needed)
    if (apiKey) void clearApiKeyHandoff();
  });
  storage.watch('sync:proxyServer', resetBgManager);

  void setupDailyActivityAlarm();
  void setupReviewAlerts();
  browser.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === DAILY_ACTIVITY_ALARM) {
      void syncDailyActivityInBackground();
      // Settings → Data → Backup → Google Drive, once a day when on (on its own: a slow
      // WaniKani or friends' page never holds it back)
      void autoBackUpToDrive();
    }
    if (isReviewAlertsAlarm(alarm.name)) void onReviewAlertsAlarm(alarm.name);
    if (isBadgeAlarm(alarm.name)) void onBadgeAlarm();
  });
  browser.notifications.onClicked.addListener(onReviewAlertClicked);
  // turned on / off, or another reminder hour, in the settings
  storage.watch('local:settings', () => void setupReviewAlerts());
  // the badge's choice changed: its alarm, a fresh summary, and the tabs' own badges reset
  let badgeMode: string | null = null;
  const applyBadgeChoice = async (settings: any) => {
    const mode = badgeModeOf(settings);
    if (mode === badgeMode) return;
    const changed = badgeMode !== null;
    badgeMode = mode;
    await setupBadgeAlarm();
    if (GLOBAL_BADGE_MODES.has(mode)) await refreshBadgeSummary(changed);
    await updateGlobalBadge({ resetTabs: changed });
  };
  void storage.getItem<any>('local:settings').then(settings => applyBadgeChoice(settings));
  storage.watch<any>('local:settings', settings => void applyBadgeChoice(settings));

  // the popup's loading screen closed during the first sync: carried on here, from the levels it
  // got (a sync already running, here or in a popup, holds the lock: nothing runs twice)
  browser.runtime.onConnect.addListener(port => {
    if (port.name !== 'wkh:first-sync') return;
    port.onDisconnect.addListener(() => void runFirstSync());
  });

  browser.runtime.onInstalled.addListener(details => {
    void setupContextMenu();
    void runStartupMigration(details.reason === 'update' && isUpdateFromV1(details.previousVersion));
    // a first install: the same page, worded for someone new (once)
    if (details.reason === 'install') void maybeOpenUpgradeNotice({ freshInstall: true });
    void setupDailyActivityAlarm();
    void setupReviewAlerts();
  });
  // alarms may be cleared when the browser restarts
  browser.runtime.onStartup.addListener(() => {
    void setupDailyActivityAlarm();
    void setupReviewAlerts();
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID) return;

    const selectedText = info.selectionText?.trim();
    if (!selectedText) return;

    await storage.setItem(CONTEXT_MENU_SEARCH_STORAGE_KEY, selectedText);

    if (tab?.id != null) {
      await applyBadge('\u2B06', '#22c55e', tab.id);
    }

    // the search waits in the popup: say so (Settings \u2192 Browser notifications)
    const settings = await storage.getItem<any>('local:settings');
    if (settings?.notifications?.searching_a_webpage_word !== false) {
      await showBrowserNotification(
        `${SEARCH_NOTIFICATION_PREFIX}${Date.now()}`,
        'Searching with WaniKani Kanji Highlighter',
        `Open the extension to search for "${selectedText}"`,
      ).catch(error => console.warn('[WKH] search notification failed:', error));
    }
  });

  // a search or an API key waiting in the popup: clicking the notification opens it
  browser.notifications.onClicked.addListener(notificationId => {
    if (!notificationId.startsWith(SEARCH_NOTIFICATION_PREFIX) && !notificationId.startsWith(API_KEY_NOTIFICATION_PREFIX)) return;
    void browser.notifications.clear(notificationId);
    // opens the popup where the browser allows it (Chrome 127+), else the badge still points to it
    void browser.action.openPopup?.().catch(() => {});
  });

  browser.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
    if (message?.type === 'wkh:selectedText') {
      const selectedText = typeof message.selectedText === 'string' ? message.selectedText : '';
      void browser.contextMenus.update(
        CONTEXT_MENU_ID,
        { title: formatContextMenuTitle(selectedText) },
      );
      return;
    }

    if (message?.type === 'wkh:badge' && sender.tab?.id != null) {
      void (async () => {
        const settings = await storage.getItem<any>('local:settings');
        const tabId = sender.tab!.id!;

        const mode = badgeModeOf(settings);
        if (mode !== 'subjects') {
          // the page's level is that tab's badge: a count (e.g. the last one, sent while the
          // page's highlighter stops for the new choice) mustn't clear it
          if (PAGE_LEVEL_BADGE_MODES.has(mode)) return;
          // null: the tab shows the browser-wide badge (if any), not an empty one of its own
          await browser.action.setBadgeText({ text: null as unknown as string, tabId }).catch(() => {});
          return;
        }

        const count = Number(message.count) || 0;
        await applyBadge(formatBadgeCount(count), getBadgeBackgroundColor(), tabId);
      })();
      return;
    }

    // the page's JLPT level (utils/highlight/pageStatsBar.ts), for the "Page's JLPT level" badge
    if (message?.type === 'wkh:badgeLevel' && sender.tab?.id != null) {
      void (async () => {
        const settings = await storage.getItem<any>('local:settings');
        if (!PAGE_LEVEL_BADGE_MODES.has(badgeModeOf(settings))) return;
        const level = typeof message.level === 'string' ? message.level : '';
        await applyBadge(level, readingLevelColor(level), sender.tab!.id!);
      })();
      return;
    }

    // the popup opened: the browser-wide badge from a fresh summary
    if (message?.type === 'wkh:badgeRefresh') {
      void (async () => {
        const settings = await storage.getItem<any>('local:settings');
        if (!GLOBAL_BADGE_MODES.has(badgeModeOf(settings))) return;
        await refreshBadgeSummary(true);
        await updateGlobalBadge();
      })();
      return;
    }

    // the review summary: the current level's radicals and kanji (their stages), for its level progress
    if (message?.type === 'wkh:getLevelSubjects') {
      handleGetLevelSubjects()
        .then(sendResponse)
        .catch(() => sendResponse(null));
      return true;
    }

    if (message?.type === 'wkh:getSubject') {
      handleGetSubject(message)
        .then(sendResponse)
        .catch(() => sendResponse(null));
      return true;
    }

    // an API key sent from WaniKani's tokens page: kept for the Login screen, badge says so
    if (message?.type === 'wkh:apiKeyFromPage') {
      const key = typeof message.key === 'string' ? message.key.trim() : '';
      const fromTokensPage = typeof sender.url === 'string' && sender.url.startsWith(TOKENS_PAGE_URL);
      if (!fromTokensPage || !API_KEY_FORMAT.test(key)) {
        sendResponse({ ok: false });
        return;
      }
      void (async () => {
        await setPendingApiKey(key, sender.tab?.id);
        // everywhere, and on that tab too (tabs with their own counter would hide the global one)
        await applyBadge('KEY', API_KEY_BADGE_COLOR);
        if (sender.tab?.id != null) await applyBadge('KEY', API_KEY_BADGE_COLOR, sender.tab.id);
        sendResponse({ ok: true });
        // like a search from the right-click menu: it waits in the popup, say so
        await showBrowserNotification(
          `${API_KEY_NOTIFICATION_PREFIX}${Date.now()}`,
          'API key received',
          'Open WaniKani Kanji Highlighter to log in with it',
        ).catch(error => console.warn('[WKH] API key notification failed:', error));
      })();
      return true;
    }

    // logged in: WaniKani's tokens page swaps the key in use for another of the same account
    if (message?.type === 'wkh:apiKeyReplace') {
      const key = typeof message.key === 'string' ? message.key.trim() : '';
      const fromTokensPage = typeof sender.url === 'string' && sender.url.startsWith(TOKENS_PAGE_URL);
      if (!fromTokensPage || !API_KEY_FORMAT.test(key)) {
        sendResponse({ ok: false, reason: 'invalid' });
        return;
      }
      replaceApiKey(key)
        .then(sendResponse)
        .catch(() => sendResponse({ ok: false, reason: 'unreachable' }));
      return true;
    }

    // friends: their public profiles are read here, one at a time
    if (message?.type === 'wkh:friends:add') {
      addFriend(String(message.username ?? ''), message.ownUsername, message.allowHibernating === true)
        .then(sendResponse)
        .catch(() => sendResponse({ ok: false, reason: 'unreachable' }));
      return true;
    }
    // a page's reading stats for the history (Settings → Page reading level); never incognito
    if (message?.type === 'wkh:pageHistory:record') {
      void (async () => {
        const settings = await storage.getItem<any>('local:settings');
        const entry = message.entry;
        if (settings?.page_stats?.history !== true || !sender.tab || sender.tab.incognito) return;
        if (!entry?.url || !/^https?:/.test(entry.url) || !entry.stats) return;
        // its sentences: only switched on, and not from a site left out
        const host = String(entry.host ?? '');
        const excluded = (await storage.getItem<string[]>(SENTENCE_EXCLUDED_SITES_KEY)) ?? [];
        const sentences = settings?.page_stats?.sentences === true && !excluded.includes(host) && Array.isArray(entry.sentences)
          ? entry.sentences
            .filter((sentence: unknown): sentence is string => typeof sentence === 'string' && sentence.length > 0)
            .slice(0, sentencesPerPage(settings))
            .map((sentence: string) => sentence.slice(0, MAX_SENTENCE_LENGTH))
          : [];
        await recordPage({
          url: pageKey(entry.url),
          title: String(entry.title ?? '').slice(0, 300),
          host,
          at: Date.now(),
          stats: entry.stats,
          ...(sentences.length ? { sentences } : {}),
        }, pageHistorySize(settings));
      })();
      return;
    }

    // an avatar chosen on WaniKani's settings page (utils/highlight/avatarHandoff.ts)
    if (message?.type === 'wkh:avatarChosen') {
      const fromWaniKani = typeof sender.url === 'string' && sender.url.startsWith('https://www.wanikani.com/');
      if (!fromWaniKani) {
        sendResponse({ ok: false, reason: 'unreachable' });
        return;
      }
      takeChosenAvatar(String(message.url ?? ''), String(message.username ?? ''))
        .then(sendResponse)
        .catch(() => sendResponse({ ok: false, reason: 'unreachable' }));
      return true;
    }

    // the login screen's Google Drive sign-in: here, so the popup closing can't cut it off
    if (message?.type === 'wkh:driveLogin') {
      void runDriveLogin();
      return;
    }

    if (message?.type === 'wkh:friends:refresh') {
      const minAge = Number(message.minAge);
      void refreshFriends(Number.isFinite(minAge) ? Math.max(minAge, 60 * 1000) : OPEN_REFRESH_MS);
      return;
    }

    // WaniKani's public pages (the avatar's profile), read here: no preloads (see wanikaniPages.ts)
    if (message?.type === 'wkh:fetchWaniKaniPage') {
      if (!isWaniKaniPage(message.url)) {
        sendResponse(null);
        return;
      }
      fetchTextDirectOrProxy(message.url)
        .then(sendResponse)
        .catch(() => sendResponse(null));
      return true;
    }

    // the details popup on web pages can't reach WaniKani's pages (the page's rules apply)
    if (message?.type === 'wkh:getMnemonicImage') {
      loadMnemonicImage(message.subject)
        .then(sendResponse)
        .catch(() => sendResponse(null));
      return true;
    }

    // the details popup on web pages can't read the extension's data files
    if (message?.type === 'wkh:getPitch') {
      const readings = Array.isArray(message.readings) ? message.readings.filter((r: unknown) => typeof r === 'string') : [];
      lookupPitchAccents(String(message.word ?? ''), readings)
        .then(sendResponse)
        .catch(() => sendResponse([]));
      return true;
    }

    if (message?.type === 'wkh:getSubjectPreviews') {
      handleGetSubjectPreviews(message)
        .then(sendResponse)
        .catch(() => sendResponse(null));
      return true;
    }

    // Side panel mode: a click on the page opens the panel. This must run synchronously
    // in this listener (it's the user's click), before anything async.
    if (message?.type === 'wkh:sidepanel:open') {
      const opened = openBrowserSidePanel({ windowId: sender.tab?.windowId, tabId: sender.tab?.id });
      void publishSidePanelSubject(message);
      if (message.switchMode) void setDetailsLocation('sidepanel');
      sendResponse({ opened });
      return;
    }

    // Hover while the panel is open: just update what it shows.
    if (message?.type === 'wkh:sidepanel:show') {
      void publishSidePanelSubject(message);
      return;
    }

    if (message?.type === 'wkh:setDetailsLocation') {
      void setDetailsLocation(message.location === 'sidepanel' ? 'sidepanel' : 'page');
      return;
    }

    if (message?.type === 'wkh:warmup') {
      // Opens the manager + IndexedDB so the first hover doesn't pay for it.
      getBgManager()
        .then(manager => sendResponse({ ready: Boolean(manager) }))
        .catch(() => sendResponse({ ready: false }));
      return true;
    }
  });
});

/** Hand the requested subject to the side panel (it watches this session item). */
async function publishSidePanelSubject(message: any): Promise<void> {
  const subjectId = Number(message?.subjectId);
  const characters = typeof message?.characters === 'string' ? message.characters.trim() : '';
  if (!Number.isFinite(subjectId) && !characters) return;

  const request: SidePanelRequest = {
    ...(Number.isFinite(subjectId) ? { subjectId } : {}),
    ...(characters ? { characters } : {}),
    ...(typeof message?.subjectType === 'string' ? { subjectType: message.subjectType } : {}),
    at: Date.now(),
  };
  await storage.setItem(SIDEPANEL_SUBJECT_KEY, request);
}

/** Switch between the in-page details popup and the side panel (Settings → Details). */
async function setDetailsLocation(location: DetailsLocation): Promise<void> {
  const settings = (await storage.getItem<any>('local:settings')) ?? {};
  await storage.setItem('local:settings', {
    ...settings,
    kanji_details_popup: { ...(settings.kanji_details_popup ?? {}), location },
  });
}

/** Highlighter span types are 'kanji' | 'vocabulary'; vocabulary also covers kana_vocabulary. */
function matchesHighlightType(subject: any, wanted?: string): boolean {
  const type = subject?.object ?? subject?.type;
  if (!wanted) return true;
  if (type === wanted) return true;
  return wanted === 'vocabulary' && type === 'kana_vocabulary';
}

function pickByType(candidates: any[], wanted?: string): any | null {
  if (!candidates.length) return null;
  return candidates.find(candidate => matchesHighlightType(candidate, wanted)) ?? candidates[0];
}

/**
 * Batch preview lookup for every item highlighted on a page.
 * Cache only: one indexed query for materials, one each for assignments and reviews.
 */
/** A key about to replace the one in use, for the same account: the account's data isn't cleared. */
const SAME_ACCOUNT_KEY = 'session:sameAccountKey';

/**
 * Logged in: another API key (from WaniKani's tokens page) in place of the one in use. Only for
 * the same account (a different one means logging out first: its data is another account's).
 */
async function replaceApiKey(key: string): Promise<{ ok: boolean; reason?: string; account?: string; username?: string; error?: string }> {
  const current = await storage.getItem<string>('sync:apiKey');
  if (!current) return { ok: false, reason: 'logged-out' };
  if (current === key) return { ok: true, reason: 'same-key' };
  const check = await verifyApiKeyWithRequest(key);
  if (!check.ok) return { ok: false, reason: 'invalid', error: check.error };
  // whose the extension is: as last seen by the popup, else asked with the key in use
  let account = await storage.getItem<string>('local:accountUsername');
  if (!account) {
    const currentCheck = await verifyApiKeyWithRequest(current).catch(() => null);
    account = currentCheck?.ok ? currentCheck.username ?? null : null;
  }
  const username = check.username ?? '';
  if (account && username && account.toLowerCase() !== username.toLowerCase()) {
    return { ok: false, reason: 'other-account', account, username };
  }
  await storage.setItem(SAME_ACCOUNT_KEY, key);
  await storage.setItem('sync:apiKey', key);
  return { ok: true, username };
}

/** WaniKani's avatars (and the older Gravatar ones): the only pictures taken from its settings page. */
const AVATAR_HOSTS = /^https:\/\/(assets\.wanikani\.com|(www\.|secure\.)?gravatar\.com)\//;

/**
 * An avatar chosen on WaniKani's settings page: downloaded and left for the popup to use (it
 * shows it and keeps it as the API manager's own, see the store's applyAvatarFromWanikani).
 * Only for the account the extension is logged in with.
 */
async function takeChosenAvatar(url: string, username: string): Promise<{ ok: boolean; reason?: string; account?: string }> {
  if (!AVATAR_HOSTS.test(url)) return { ok: false, reason: 'unreachable' };
  if (!(await storage.getItem<string>('sync:apiKey'))) return { ok: false, reason: 'logged-out' };
  const account = await storage.getItem<string>('local:accountUsername');
  if (account && username && account.toLowerCase() !== username.toLowerCase()) {
    return { ok: false, reason: 'other-account', account };
  }
  const response = await fetch(url);
  if (!response.ok) return { ok: false, reason: 'unreachable' };
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) return { ok: false, reason: 'unreachable' };
  const image = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  await storage.setItem('local:avatarFromWanikani', { username: account || username, image, at: Date.now() });
  return { ok: true };
}

/**
 * The current level's kanji, with their SRS stage and passed date, from the cache (no request):
 * the review summary works out the level's progress before and after the session from them.
 */
async function handleGetLevelSubjects(): Promise<{ level: number; subjects: any[] } | null> {
  const manager = await getBgManager();
  if (!manager) return null;
  // cached (a callback: no waiting on the API); the cache may be empty in a restarted service
  // worker: then asked (one request)
  const userInfo = (await manager.getUserInfo(() => {})) ?? (await manager.getUserInfo(null));
  const level = Number(userInfo?.level);
  if (!Number.isFinite(level) || level < 1) return null;
  const ids = await manager.storage.getIdsByLevel([level]);
  const all = ids?.length ? await manager.readSubjectsById(ids) : [];
  const subjects = (all ?? [])
    .filter((subject: any) => (subject?.type === 'kanji' || subject?.type === 'radical') && !subject.assignment?.hidden)
    .map((subject: any) => ({
      id: subject.id,
      type: subject.type,
      assignment: {
        srs_stage: subject.assignment?.srs_stage ?? 0,
        passed_at: subject.assignment?.passed_at ?? null,
        hidden: false,
      },
    }));
  return subjects.length ? { level, subjects } : null;
}

async function handleGetSubjectPreviews(message: any): Promise<any | null> {
  const manager = await getBgManager();
  if (!manager) return null;

  const items: Array<{ value: string; type?: string }> = Array.isArray(message?.items)
    ? message.items.filter((item: any) => typeof item?.value === 'string' && item.value)
    : [];
  if (!items.length) return { subjects: {} };

  const subjects = await manager.readSubjectsByCharacters(items.map(item => item.value));

  const byChars = new Map<string, any[]>();
  for (const subject of subjects ?? []) {
    if (!subject?.characters) continue;
    const list = byChars.get(subject.characters) ?? [];
    list.push(subject);
    byChars.set(subject.characters, list);
  }

  const result: Record<string, any> = {};
  for (const item of items) {
    const pick = pickByType(byChars.get(item.value) ?? [], item.type);
    if (pick) result[`${item.type ?? ''}:${item.value}`] = enrichSubjectWithSchoolGrades(pick);
  }

  return { subjects: result };
}

async function handleGetSubject(message: any): Promise<any | null> {
  const manager = await getBgManager();
  if (!manager) return null;

  const includeRelated = message?.includeRelated !== false;
  const ensureReviews = message?.ensureReviews !== false;

  let subjectId = Number(message?.subjectId);
  let subject: any = null;

  if (Number.isFinite(subjectId)) {
    subject = (await manager.readSubjectsById(subjectId))?.[0] ?? null;
  } else {
    const characters = typeof message?.characters === 'string' ? message.characters.trim() : '';
    if (!characters) return null;

    // Exact, indexed lookup: the popup only needs the hovered subject itself.
    subject = pickByType(await manager.readSubjectsByCharacters(characters), message?.subjectType);
    subjectId = subject?.id;
  }

  if (!subject && Number.isFinite(subjectId)) {
    const fetched = await manager.getSubjectsById(subjectId, () => {});
    subject = fetched?.[0] ?? null;
  }
  if (!subject || !Number.isFinite(subjectId)) return null;

  const subjectWithStats = ensureReviews
    ? await ensureSubjectReviewStats(manager, subject)
    : subject;

  const enrichedSubject = enrichSubjectWithSchoolGrades(subjectWithStats);

  if (!includeRelated) {
    return { subject: enrichedSubject, related: {} };
  }

  const relatedIds = getRelatedSubjectIds(enrichedSubject).filter(id => id !== subjectId);
  const relatedSubjects = relatedIds.length
    ? await manager.readSubjectsById(relatedIds)
    : [];

  const related: Record<number, any> = {};
  for (const entry of relatedSubjects ?? []) {
    if (entry?.id != null) related[entry.id] = entry;
  }

  return { subject: enrichedSubject, related };
}
