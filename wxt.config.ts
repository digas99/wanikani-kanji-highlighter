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
	permissions: ['storage', 'contextMenus', 'tabs'],
    browser_specific_settings: {
      gecko: {
        id: 'wanikani-kanji-highlighter@wkhighlighter.com',
        strict_min_version: '109.0',
      },
    },
    host_permissions: [
      'https://api.github.com/*',
      'https://api.wanikani.com/*',
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
    ],
  }
});
