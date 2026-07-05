import { runHighlighter } from '@/utils/highlight/runtime';
import { mountDetailsPopup } from '@/utils/highlight/detailsPopup';
import { watchSelectionForContextMenu } from '@/utils/highlight/contextMenuSelection';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  async main(ctx) {
    watchSelectionForContextMenu();
    await runHighlighter();
    await mountDetailsPopup(ctx);
  },
});
