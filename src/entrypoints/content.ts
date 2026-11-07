import { runHighlighter } from '@/utils/highlight/runtime';
import { mountDetailsPopup } from '@/utils/highlight/detailsPopup';
import { watchSelectionForContextMenu } from '@/utils/highlight/contextMenuSelection';
import { watchApiKeyHandoff } from '@/utils/highlight/apiKeyHandoff';
import { watchAvatarChoice } from '@/utils/highlight/avatarHandoff';
import { mountPageStats } from '@/utils/highlight/pageStatsBar';
import { mountReviewInfo } from '@/utils/highlight/reviewInfo';
import { mountReviewTimer } from '@/utils/highlight/reviewTimer';
import { mountReviewSummary } from '@/utils/highlight/reviewSummary';
import { watchPartnerPresence } from '@/utils/scripts/partnerExtension';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  async main(ctx) {
    watchSelectionForContextMenu();
    // the HanziHero Companion, if it's installed too: each learns the other's id (to keep their choices opposite)
    watchPartnerPresence();
    // WaniKani's API tokens page: "Send to WK Highlighter" next to the keys
    watchApiKeyHandoff();
    // WaniKani's settings page: a newly chosen avatar goes to the extension too
    void watchAvatarChoice();
    await runHighlighter();
    await mountDetailsPopup(ctx);
    // the page's reading level (bar / history): only when turned on in the settings
    await mountPageStats(ctx);
    // after WaniKani's reviews: a summary of the session (off by default); before the info,
    // which follows the session for it
    await mountReviewSummary();
    // WaniKani's reviews page: the subject's info, never its answer (off by default)
    await mountReviewInfo();
    // WaniKani's reviews page: a countdown, then Wrap Up (off by default)
    await mountReviewTimer();
  },
});
