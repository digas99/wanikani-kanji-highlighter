import { WebExtConfig } from '../types';
/**
 * @deprecated Use `defineWebExtConfig` instead. Same function, different name.
 */
export declare function defineRunnerConfig(config: WebExtConfig): WebExtConfig;
/**
 * Configure how [`web-ext`](https://github.com/mozilla/web-ext) starts the browser during development.
 */
export declare function defineWebExtConfig(config: WebExtConfig): WebExtConfig;
