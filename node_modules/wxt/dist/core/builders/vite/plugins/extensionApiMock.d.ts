import type * as vite from 'vite';
import { ResolvedConfig } from '../../../../types';
/**
 * Mock `wxt/browser` and stub the global `browser`/`chrome` types with a fake version of the extension APIs
 */
export declare function extensionApiMock(config: ResolvedConfig): vite.PluginOption;
