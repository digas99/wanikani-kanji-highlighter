import { defineConfig } from 'wxt';
import { EventEmitter } from 'events';

EventEmitter.defaultMaxListeners = 20;

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  srcDir: 'src',
  manifest: {
    permissions: ['storage'],
  }
});
