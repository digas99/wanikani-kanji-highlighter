import { ResolvedConfig, WxtBuilder, WxtDevServer, WxtHooks } from '../../../types';
import { Hookable } from 'hookable';
export declare function createViteBuilder(wxtConfig: ResolvedConfig, hooks: Hookable<WxtHooks>, getWxtDevServer?: () => WxtDevServer | undefined): Promise<WxtBuilder>;
/**
 * Recursively remove all directories that are empty/
 */
export declare function removeEmptyDirs(dir: string): Promise<void>;
