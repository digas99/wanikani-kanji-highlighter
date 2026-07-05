import { storage } from '#imports';
import { createWKManager } from '@/lib/apiClient';
import {
	CONTEXT_MENU_DEFAULT_TITLE,
	CONTEXT_MENU_ID,
	CONTEXT_MENU_SEARCH_STORAGE_KEY,
	formatContextMenuTitle,
} from '@/utils/scripts/contextMenuSearch';
import {
	formatBadgeCount,
	getBadgeBackgroundColor,
	getContrastTextColor,
	isKanjiCounterEnabled,
} from '@/utils/scripts/extensionBadge';
import { getRelatedSubjectIds, ensureSubjectReviewStats } from '@/utils/scripts/subjectDetailsPopup';
import { enrichSubjectWithSchoolGrades } from '@/utils/scripts/schoolKanji';
import { migrateFromV15IfNeeded } from '@/utils/scripts/migrateFromV15';
import { runInitialDataSyncIfNeeded } from '@/utils/scripts/initialDataSync';
import { maybeOpenUpgradeNotice } from '@/utils/scripts/upgradeNotice';

async function runStartupMigration(): Promise<void> {
  const result = await migrateFromV15IfNeeded();
  await runInitialDataSyncIfNeeded();
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

  browser.runtime.onInstalled.addListener(() => {
    void setupContextMenu();
    void runStartupMigration();
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID) return;

    const selectedText = info.selectionText?.trim();
    if (!selectedText) return;

    await storage.setItem(CONTEXT_MENU_SEARCH_STORAGE_KEY, selectedText);

    if (tab?.id != null) {
      await applyBadge('\u2B06', '#22c55e', tab.id);
    }
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

        if (!isKanjiCounterEnabled(settings)) {
          await applyBadge('', '#666666', tabId);
          return;
        }

        const count = Number(message.count) || 0;
        await applyBadge(formatBadgeCount(count), getBadgeBackgroundColor(), tabId);
      })();
      return;
    }

    if (message?.type === 'wkh:getSubject') {
      handleGetSubject(message)
        .then(sendResponse)
        .catch(() => sendResponse(null));
      return true;
    }
  });
});

async function handleGetSubject(message: any): Promise<any | null> {
  const manager = await getBgManager();
  if (!manager) return null;

  const includeRelated = message?.includeRelated !== false;
  const ensureReviews = message?.ensureReviews !== false;

  let subjectId = Number(message?.subjectId);
  let pick: any = null;

  if (Number.isFinite(subjectId)) {
    const subjects = await manager.readSubjectsById(subjectId);
    pick = subjects?.[0] ?? null;
  } else {
    const characters = typeof message?.characters === 'string' ? message.characters.trim() : '';
    if (!characters) return null;

    const materials = await manager.storage.getMaterialsByCharacters(characters);
    if (!materials?.length) return null;

    const wanted = message?.subjectType;
    const exact = materials.filter((m: any) => m.characters === characters);
    const pool = exact.length ? exact : materials;
    pick = pool.find((m: any) => (m.object ?? m.type) === wanted) ?? pool[0];
    subjectId = pick?.id;
  }

  if (!pick || !Number.isFinite(subjectId)) return null;

  let [subject] = await manager.readSubjectsById(subjectId);
  if (!subject) {
    const fetched = await manager.getSubjectsById(subjectId, () => {});
    subject = fetched?.[0] ?? null;
  }
  if (!subject) return null;

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
