import { defineConfig } from 'wxt';
import devtools from 'vite-plugin-vue-devtools'
import { EventEmitter } from 'events';

EventEmitter.defaultMaxListeners = 20;

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  imports: {
    // Linked package resolves outside node_modules; unimport would inject
    // `storage` from wxt into the bundled API manager file.
    exclude: [/wanikani-api-manager/],
  },
  vite: () => ({
    plugins: [
      devtools({
        appendTo: '/src/entrypoints/popup/main.ts'
      })
    ]
  }),
  srcDir: 'src',
  manifest: {
	// shown in the browser's extensions list (without it, the package's name and a placeholder)
	name: 'WaniKani Kanji Highlighter',
	description: 'Unofficial kanji highlighter, matching kanji and words learned with WaniKani.',
	// unlimitedStorage: v1.5 had it (no new prompt for upgraders); without it storage.local
	// is capped (~10 MB) and the IndexedDB subject cache can be evicted under disk pressure.
	// alarms: hourly background sync for the "Today" / "Yesterday" activity (no install prompt)
	// notifications: new reviews / the daily reminder (Settings → General)
	// identity: Google sign-in for the Drive backup (Settings → General → Backup; no install prompt)
	permissions: ['storage', 'unlimitedStorage', 'contextMenus', 'tabs', 'alarms', 'notifications', 'identity'],
	// Chrome's own Google sign-in (the Web Store item's OAuth client): only the Drive app folder
	oauth2: {
	  client_id: '394034186676-emo8eoah6s4jel7vr3nmaq3lsusc6hrc.apps.googleusercontent.com',
	  scopes: ['https://www.googleapis.com/auth/drive.appdata'],
	},
    browser_specific_settings: {
      gecko: {
        id: 'wanikani-kanji-highlighter@wkhighlighter.com',
        strict_min_version: '109.0',
      },
    },
    host_permissions: [
      'https://api.github.com/*',
      'https://api.wanikani.com/*',
      // public pages: avatars (profile) and radicals' mnemonic drawings. Already covered by
      // the content script's <all_urls>, so no new install / update warning.
      'https://www.wanikani.com/*',
      'https://kanji.wkhighlighter.com/*',
      'https://kanjiapi.dev/*',
    ],
    web_accessible_resources: [
      {
        resources: [
          'icons/kanjiDraw/*',
          'icons/search/*',
          'icons/subjectDetails/*',
          'icons/features/*',
          'icons/sidebar/*',
        ],
        matches: ['*://*/*'],
      },
      {
        // WaniKani's reviews page: reads its quiz events for the review panel (Settings → Details);
        // the icon marks what the extension adds to WaniKani's pages (e.g. its settings' Avatars)
        resources: ['wk-review-bridge.js', 'icon/32.png'],
        matches: ['https://www.wanikani.com/*'],
      },
    ],
  }
});
