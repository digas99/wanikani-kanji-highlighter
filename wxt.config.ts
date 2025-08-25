import { defineConfig } from 'wxt';
import devtools from 'vite-plugin-vue-devtools'
import { EventEmitter } from 'events';

EventEmitter.defaultMaxListeners = 20;

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  vite: () => ({
    plugins: [
      devtools({
        appendTo: '/src/entrypoints/popup/main.ts'
      })
    ]
  }),
  srcDir: 'src',
  manifest: {
    permissions: ['storage'],
  }
});
